import React from "react";

import { makeAutoObservable } from "mobx";

import { ReactCodeMirrorRef } from "@uiw/react-codemirror";

import { IEnvironment } from "../types/environment";
import { IStep } from "../types/step";
import { JSInterpreter } from "../computation-engines/manual/interpreter";

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

  // Variable linkage tracking
  linkageMap: Record<string, string> = {};

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

  setViews(views: any[]) {
    this.views = views;
  }

  setLinkageMap(linkageMap: Record<string, string>) {
    this.linkageMap = linkageMap;
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
      Object.keys(this.linkageMap).find(
        (key) => this.linkageMap[key] === varId
      ) || null
    );
  }
}

// Create singleton instance
export const executionStore = new ExecutionStore();
