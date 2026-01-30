import React from "react";

import { makeAutoObservable } from "mobx";

import { ReactCodeMirrorRef } from "@uiw/react-codemirror";

import { JSInterpreter } from "../engine/manual/interpreter";
import { Step } from "../engine/manual/step";
import { IEnvironment } from "../types/environment";
import { IInterpreterStep, IObject, IStep } from "../types/step";

/**
 * MobX store for execution state that provides immediate updates
 * without the async batching behavior of React useState
 */
class ExecutionStore {
  // Core execution state
  code: string = "";
  userCode: string = ""; // User-facing formatted code for display in UI
  environment: IEnvironment | null = null;
  interpreter: JSInterpreter | null = null;
  history: IInterpreterStep[] = [];
  historyIndex: number = 0;
  isComplete: boolean = false;

  // Stepping modes
  steppingMode: "line" | "view" = "view";

  // Stepping states
  isToStep: boolean = false;
  isToIndex: boolean = false;
  isToBlock: boolean = false;

  // Target for toIndex
  targetIndex: { varId: string; index: number } | null = null;

  // UI/Execution states that were previously useState
  isRunning: boolean = false;
  error: string | null = null;
  autoPlaySpeed: number = 1000; // Default 1 second
  steps: any[] = []; // Type can be refined based on actual usage

  // Track which step indices are step points (ordered array for efficient navigation)
  stepPoints: number[] = [];

  // Track which step indices are block points (ordered array for efficient navigation)
  blockPoints: number[] = [];

  // Currently active (changed) variables in the current step
  // Map from formulaId to Set of active variable IDs
  // Empty string key '' means "all formulas"
  activeVariables: Map<string, Set<string>> = new Map();

  // First values seen for each linked variable during initial execution
  // Used to reset variables when stepping backward to before their declaration
  firstSeenValues: Map<string, number> = new Map();

  // Extension configs for adding items to step extensions based on viewId
  objectConfigs: IObject[] = [];

  resetCount: number = 0;

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

  setUserCode(userCode: string) {
    this.userCode = userCode;
  }

  setEnvironment(environment: IEnvironment | null) {
    this.environment = environment;
  }

  setInterpreter(interpreter: JSInterpreter | null) {
    this.interpreter = interpreter;
  }

  addToHistory(state: IInterpreterStep) {
    this.history.push(state);
  }

  setHistory(history: IInterpreterStep[]) {
    this.history = history;
  }

  /**
   * Set extension configs that define how items are added to step extensions.
   * These configs are processed during history formation.
   */
  setObject(object: IObject[]): void {
    this.objectConfigs = object;
  }

  /**
   * Add an extension config and process it immediately if history exists.
   * This allows configs to be registered after history is built (e.g., from React useEffect).
   */
  addObject(object: IObject): void {
    // Check if this config key already exists to avoid duplicates on re-render
    const existingIndex = this.objectConfigs.findIndex(
      (c) => c.key === object.key
    );
    if (existingIndex >= 0) {
      this.objectConfigs[existingIndex] = object;
    } else {
      this.objectConfigs.push(object);
    }

    // If history already exists, process this config immediately
    if (this.history.length > 0) {
      Step.processObjects(this.history, [object]);
    }
  }

  /**
   * Process all extension configs against the current history.
   * Called automatically after history is built.
   */
  processExtensions(): void {
    if (this.objectConfigs.length > 0) {
      Step.processObjects(this.history, this.objectConfigs);
    }
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

  setIsSteppingToStep(stepping: boolean) {
    this.isToStep = stepping;
  }

  setIsSteppingToIndex(stepping: boolean) {
    this.isToIndex = stepping;
  }

  setIsSteppingToBlock(stepping: boolean) {
    this.isToBlock = stepping;
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

  setActiveVariables(variables: Map<string, Set<string>>) {
    this.activeVariables = variables;
  }

  setStep(stepPoints: number[]) {
    this.stepPoints = [...stepPoints].sort((a, b) => a - b);
  }

  isView(index: number): boolean {
    return this.stepPoints.includes(index);
  }

  getNextView(currentIndex: number): number | null {
    const next = this.stepPoints.find((point) => point > currentIndex);
    return next !== undefined ? next : null;
  }

  getPrevView(currentIndex: number): number | null {
    // Find the largest point that's smaller than currentIndex
    for (let i = this.stepPoints.length - 1; i >= 0; i--) {
      if (this.stepPoints[i] < currentIndex) {
        return this.stepPoints[i];
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
  get currentState(): IInterpreterStep | undefined {
    return this.history[this.historyIndex];
  }

  get currentStep(): IStep | undefined {
    return this.history[this.historyIndex]?.step;
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
    this.userCode = "";
    this.environment = null;
    this.interpreter = null;
    this.history = [];
    this.historyIndex = 0;
    this.isComplete = false;
    this.isToStep = false;
    this.isToIndex = false;
    this.isToBlock = false;
    this.targetIndex = null;
    this.isRunning = false;
    this.error = null;
    this.autoPlaySpeed = 1000;
    this.steps = [];
    this.stepPoints = [];
    this.blockPoints = [];
    this.activeVariables = new Map();
    this.firstSeenValues = new Map();
    this.objectConfigs = [];
    this.resetCount++;
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
}

/**
 * Factory function to create a new ExecutionStore instance.
 * Used for creating scoped stores per FormulizeProvider.
 */
export function createExecutionStore(): ExecutionStore {
  return new ExecutionStore();
}

// Export the class for type usage
export { ExecutionStore };
