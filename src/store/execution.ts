import React from "react";

import { makeAutoObservable } from "mobx";

import { ReactCodeMirrorRef } from "@uiw/react-codemirror";

import { JSInterpreter } from "../engine/manual/interpreter";
import { IEnvironment } from "../types/environment";
import { IStep } from "../types/step";

/**
 * MobX store for execution state that provides immediate updates
 * without the async batching behavior of React useState
 */
class ExecutionStore {
  // Core execution state
  code: string = "";
  environment: IEnvironment | null = null;
  interpreter: JSInterpreter | null = null;
  history: IStep[] = [];
  historyIndex: number = 0;
  isComplete: boolean = false;

  // Stepping modes
  steppingMode: "line" | "view" = "view";

  // Stepping states
  isSteppingToView: boolean = false;
  isSteppingToIndex: boolean = false;
  isSteppingToBlock: boolean = false;

  // Target for stepToIndex
  targetIndex: { varId: string; index: number } | null = null;

  // UI/Execution states that were previously useState
  isRunning: boolean = false;
  error: string | null = null;
  autoPlaySpeed: number = 1000; // Default 1 second
  views: any[] = []; // Type can be refined based on actual usage

  // Variable linkage tracking - supports multi-linkages (string | string[])
  linkageMap: Record<string, string | string[]> = {};

  // Track which step indices are view points (ordered array for efficient navigation)
  viewPoints: number[] = [];

  // Track which step indices are block points (ordered array for efficient navigation)
  blockPoints: number[] = [];

  // Current view descriptions for variables (set when at view points)
  currentViewDescriptions: Record<string, string> = {};

  // Currently active (changed) variables in the current step
  activeVariables: Set<string> = new Set();

  // Refs for UI components
  autoPlayIntervalRef: React.MutableRefObject<number | null> =
    React.createRef() as React.MutableRefObject<number | null>;
  codeMirrorRef: React.MutableRefObject<ReactCodeMirrorRef | null> =
    React.createRef() as React.MutableRefObject<ReactCodeMirrorRef | null>;

  constructor() {
    makeAutoObservable(this);
  }

  // Immediate state updates
  setCode(code: string) {
    this.code = code;
  }

  setEnvironment(environment: IEnvironment | null) {
    this.environment = environment;
  }

  setInterpreter(interpreter: JSInterpreter | null) {
    this.interpreter = interpreter;
  }

  addToHistory(state: IStep) {
    this.history.push(state);
  }

  setHistory(history: IStep[]) {
    this.history = history;
  }

  setHistoryIndex(index: number) {
    this.historyIndex = index;
  }

  setIsComplete(complete: boolean) {
    this.isComplete = complete;
  }

  setSteppingMode(mode: "line" | "view") {
    this.steppingMode = mode;
  }

  setIsSteppingToView(stepping: boolean) {
    this.isSteppingToView = stepping;
  }

  setIsSteppingToIndex(stepping: boolean) {
    this.isSteppingToIndex = stepping;
  }

  setIsSteppingToBlock(stepping: boolean) {
    this.isSteppingToBlock = stepping;
  }

  setTargetIndex(target: { varId: string; index: number } | null) {
    this.targetIndex = target;
  }

  setIsRunning(running: boolean) {
    this.isRunning = running;
  }

  setError(error: string | null) {
    this.error = error;
  }

  setAutoPlaySpeed(speed: number) {
    this.autoPlaySpeed = speed;
  }

  setLinkageMap(linkageMap: Record<string, string | string[]>) {
    this.linkageMap = linkageMap;
  }

  setCurrentViewDescriptions(descriptions: Record<string, string>) {
    this.currentViewDescriptions = descriptions;
  }

  setActiveVariables(variables: Set<string>) {
    this.activeVariables = variables;
  }

  setView(viewPoints: number[]) {
    this.viewPoints = [...viewPoints].sort((a, b) => a - b);
  }

  isView(index: number): boolean {
    return this.viewPoints.includes(index);
  }

  getNextView(currentIndex: number): number | null {
    const next = this.viewPoints.find((point) => point > currentIndex);
    return next !== undefined ? next : null;
  }

  getPrevView(currentIndex: number): number | null {
    // Find the largest point that's smaller than currentIndex
    for (let i = this.viewPoints.length - 1; i >= 0; i--) {
      if (this.viewPoints[i] < currentIndex) {
        return this.viewPoints[i];
      }
    }
    return null;
  }

  setBlock(blockPoints: number[]) {
    this.blockPoints = [...blockPoints].sort((a, b) => a - b);
  }

  isBlock(index: number): boolean {
    return this.blockPoints.includes(index);
  }

  getNextBlock(currentIndex: number): number | null {
    const next = this.blockPoints.find((point) => point > currentIndex);
    return next !== undefined ? next : null;
  }

  getPrevBlock(currentIndex: number): number | null {
    // Find the largest point that's smaller than currentIndex
    for (let i = this.blockPoints.length - 1; i >= 0; i--) {
      if (this.blockPoints[i] < currentIndex) {
        return this.blockPoints[i];
      }
    }
    return null;
  }

  // Computed getters for convenience
  get currentState(): IStep | undefined {
    return this.history[this.historyIndex];
  }

  get isAtEndOfHistory(): boolean {
    return this.historyIndex >= this.history.length - 1;
  }

  get isBrowsingHistory(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  // Reset all state
  reset() {
    this.code = "";
    this.environment = null;
    this.interpreter = null;
    this.history = [];
    this.historyIndex = 0;
    this.isComplete = false;
    this.isSteppingToView = false;
    this.isSteppingToIndex = false;
    this.isSteppingToBlock = false;
    this.targetIndex = null;
    this.isRunning = false;
    this.error = null;
    this.autoPlaySpeed = 1000;
    this.views = [];
    this.linkageMap = {};
    this.viewPoints = [];
    this.blockPoints = [];
    this.currentViewDescriptions = {};
    this.activeVariables = new Set();
    // Reset refs
    this.autoPlayIntervalRef = React.createRef() as React.MutableRefObject<
      number | null
    >;
    this.codeMirrorRef =
      React.createRef() as React.MutableRefObject<ReactCodeMirrorRef | null>;
  }

  // Utility methods
  canStepForward(): boolean {
    return !!this.interpreter && !this.isComplete;
  }

  canStepBackward(): boolean {
    return this.historyIndex > 0;
  }

  hasViews(): boolean {
    return this.views.length > 0;
  }

  /**
   * Gets the actual variable name that's linked to a variable ID
   * Uses the linkage map to resolve the connection between UI controls and code variables
   */
  getLinkedVar(varId: string): string | null {
    return (
      Object.keys(this.linkageMap).find((key) => {
        const linkage = this.linkageMap[key];
        // Handle both single string and array of strings (multi-linkage)
        if (Array.isArray(linkage)) {
          return linkage.includes(varId);
        }
        return linkage === varId;
      }) || null
    );
  }
}

// Create singleton instance
export const executionStore = new ExecutionStore();
