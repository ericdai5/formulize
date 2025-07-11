import { EditorView } from "@codemirror/view";

import { IEnvironment } from "../../../types/environment";
import { computationStore } from "../../computation";
import { Connector } from "./connector";
import { ERROR_MESSAGES } from "./constants";
import { DebugState, Debugger } from "./debug";
import { JSInterpreter, initializeInterpreter, isAtView } from "./interpreter";

export interface Execution {
  code: string;
  environment: IEnvironment | null;
  interpreter: JSInterpreter | null;
  history: DebugState[];
  currentHistoryIndex: number;
  isComplete: boolean;
  isSteppingToView: boolean;
  isSteppingToIndex: boolean;
  targetIndex: { varId: string; index: number } | null;
  autoPlayIntervalRef: React.MutableRefObject<number | null>;
  codeMirrorRef: React.MutableRefObject<unknown>;

  setInterpreter: (interpreter: JSInterpreter | null) => void;
  setHistory: React.Dispatch<React.SetStateAction<DebugState[]>>;
  setCurrentHistoryIndex: (index: number) => void;
  setIsComplete: (complete: boolean) => void;
  setError: (error: string | null) => void;
  setIsRunning: (running: boolean) => void;
  setIsSteppingToView: (stepping: boolean) => void;
  setIsSteppingToIndex: (stepping: boolean) => void;
  setTargetIndex: (target: { varId: string; index: number } | null) => void;
}

export class Controller {
  // ============================================================================
  // Execution Lifecycle Management
  // ============================================================================

  private static initializeExecution(ctx: Execution): void {
    const variables = computationStore.getVariables();
    const interpreter = initializeInterpreter(
      ctx.code,
      ctx.setError,
      variables
    );
    if (!interpreter) return;

    // Initialize variable linkage tracker with configuration from environment
    const variableLinkage =
      ctx.environment?.formulas?.[0]?.variableLinkage || {};
    Connector.initialize(variableLinkage);

    ctx.setInterpreter(interpreter);
    const initialState = Debugger.snapshot(interpreter, 0, ctx.code);
    ctx.setHistory([initialState]);
    ctx.setCurrentHistoryIndex(0);
    Debugger.updateHighlight(ctx.codeMirrorRef, initialState.highlight);
  }

  private static finishExecution(ctx: Execution): void {
    ctx.setIsComplete(true);
    ctx.setIsRunning(false);
    ctx.setIsSteppingToView(false);
    ctx.setIsSteppingToIndex(false);
    this.clearAutoPlay(ctx);
  }

  static refresh(ctx: Execution): void {
    ctx.setInterpreter(null);
    ctx.setHistory([]);
    ctx.setCurrentHistoryIndex(0);
    ctx.setIsComplete(false);
    ctx.setError(null);
    ctx.setIsRunning(false);
    ctx.setIsSteppingToView(false);
    ctx.setIsSteppingToIndex(false);
    ctx.setTargetIndex(null);
    this.clearProcessedIndices();
    this.clearAutoPlay(ctx);
    this.resetCodeMirror(ctx);

    // Clear variable linkage tracker
    Connector.clearAssignments();

    if (!ctx.code.trim()) {
      ctx.setError(ERROR_MESSAGES.NO_CODE);
      return;
    }
    this.initializeExecution(ctx);
  }

  // ============================================================================
  // Singular Stepping
  // ============================================================================

  static stepForward(ctx: Execution): void {
    if (!ctx.interpreter || ctx.isComplete) return;
    try {
      // Check if we're at the end of history or behind
      if (ctx.currentHistoryIndex < ctx.history.length - 1) {
        // We're behind in history, just move forward in existing history
        const newIndex = ctx.currentHistoryIndex + 1;
        ctx.setCurrentHistoryIndex(newIndex);
        // Also update the execution context immediately for UI consistency
        ctx.currentHistoryIndex = newIndex;
        const state = ctx.history[newIndex];
        Debugger.updateHighlight(ctx.codeMirrorRef, state.highlight);
      } else {
        // We're at the end of history, create a new state
        const canContinue = ctx.interpreter.step();
        const newState = Debugger.snapshot(
          ctx.interpreter,
          ctx.history.length,
          ctx.code
        );
        ctx.setHistory((prev) => [...prev, newState]);
        const newIndex = ctx.currentHistoryIndex + 1; // Increment from current index
        ctx.setCurrentHistoryIndex(newIndex);
        // Also update the execution context immediately for UI consistency
        ctx.currentHistoryIndex = newIndex;
        Debugger.updateHighlight(ctx.codeMirrorRef, newState.highlight);
        if (!canContinue) {
          this.finishExecution(ctx);
        }
      }

      if (ctx.isSteppingToView && isAtView(ctx.interpreter)) {
        ctx.setIsSteppingToView(false);
      }
    } catch (err) {
      this.handleError(ctx, err);
    }
  }

  // Helper method to ensure we're at the end of history before executing new steps
  static moveToEndOfHistory(ctx: Execution): void {
    if (ctx.currentHistoryIndex < ctx.history.length - 1) {
      ctx.setCurrentHistoryIndex(ctx.history.length - 1);
    }
  }

  static stepBackward(ctx: Execution): void {
    if (ctx.currentHistoryIndex <= 0) return;
    // Decrement the history index
    const newIndex = ctx.currentHistoryIndex - 1;
    ctx.setCurrentHistoryIndex(newIndex);
    // Also update the execution context immediately for UI consistency
    ctx.currentHistoryIndex = newIndex;
    // Get the state at the new index
    const prevState = ctx.history[newIndex];
    // Update highlight to show the previous state
    Debugger.updateHighlight(ctx.codeMirrorRef, prevState.highlight);
  }

  // ============================================================================
  // Step to Specific Destination
  // ============================================================================

  static stepToView(ctx: Execution): void {
    if (!ctx.interpreter || ctx.isComplete) return;

    // If we're browsing history, move to the end first
    if (ctx.currentHistoryIndex < ctx.history.length - 1) {
      const endIndex = ctx.history.length - 1;
      ctx.setCurrentHistoryIndex(endIndex);
      // Also update the execution context immediately for UI consistency
      ctx.currentHistoryIndex = endIndex;
    }

    ctx.setIsSteppingToView(true);
    try {
      this.stepPastCurrentView(ctx);
      if (ctx.isComplete) {
        ctx.setIsSteppingToView(false);
        return;
      }
      this.stepToNextView(ctx);
    } catch (err) {
      this.handleError(ctx, err);
      ctx.setIsSteppingToView(false);
    }
  }

  static stepToIndex(ctx: Execution, varId: string, targetIndex: number): void {
    if (!ctx.interpreter || ctx.isComplete) return;
    ctx.setIsSteppingToIndex(true);
    ctx.setTargetIndex({ varId, index: targetIndex });
    try {
      const searching = true;
      while (searching) {
        if (this.atTargetIndex(ctx.interpreter, varId, targetIndex)) {
          this.completeStepToIndex(ctx);
          return;
        }
        this.stepToView(ctx);
        if (ctx.isComplete) {
          this.completeStepToIndex(ctx);
          return;
        }
      }
    } catch (err) {
      this.handleError(ctx, err);
      this.completeStepToIndex(ctx);
    }
  }

  private static clearProcessedIndices(): void {
    computationStore.clearProcessedIndices();
  }

  private static clearAutoPlay(ctx: Execution): void {
    if (ctx.autoPlayIntervalRef.current) {
      clearInterval(ctx.autoPlayIntervalRef.current);
      ctx.autoPlayIntervalRef.current = null;
    }
  }

  private static resetCodeMirror(ctx: Execution): void {
    if (ctx.codeMirrorRef.current) {
      const codeMirrorInstance = ctx.codeMirrorRef.current as {
        view?: EditorView;
      };
      const view = codeMirrorInstance.view;
      if (view) {
        view.dispatch({
          selection: { anchor: 0, head: 0 },
          scrollIntoView: true,
        });
      }
    }
  }

  private static handleError(ctx: Execution, err: unknown): void {
    ctx.setError(`${ERROR_MESSAGES.EXECUTION_ERROR}: ${err}`);
    ctx.setIsRunning(false);
    ctx.setIsSteppingToView(false);
    ctx.setIsSteppingToIndex(false);
    this.clearAutoPlay(ctx);
  }

  private static stepPastCurrentView(ctx: Execution): void {
    if (!ctx.interpreter || !isAtView(ctx.interpreter)) {
      return;
    }
    let atSameView = true;
    const interpreter = ctx.interpreter;
    let currentIndex = ctx.currentHistoryIndex;
    while (atSameView) {
      const canContinue = interpreter.step();
      const newState = Debugger.snapshot(
        interpreter,
        ctx.history.length,
        ctx.code
      );
      ctx.setHistory((prev) => [...prev, newState]);
      currentIndex = currentIndex + 1; // Track the correct index
      ctx.setCurrentHistoryIndex(currentIndex);
      // Also update the execution context immediately for UI consistency
      ctx.currentHistoryIndex = currentIndex;
      Debugger.updateHighlight(ctx.codeMirrorRef, newState.highlight);
      if (!canContinue) {
        ctx.setIsComplete(true);
        return;
      }
      atSameView = isAtView(interpreter);
    }
  }

  private static stepToNextView(ctx: Execution): void {
    if (!ctx.interpreter) return;
    let foundNextView = false;
    const interpreter = ctx.interpreter;
    let currentIndex = ctx.currentHistoryIndex;
    while (!foundNextView) {
      const canContinue = interpreter.step();
      const state = Debugger.snapshot(
        interpreter,
        ctx.history.length,
        ctx.code
      );
      ctx.setHistory((prev) => [...prev, state]);
      currentIndex = currentIndex + 1; // Track the correct index
      ctx.setCurrentHistoryIndex(currentIndex);
      // Also update the execution context immediately for UI consistency
      ctx.currentHistoryIndex = currentIndex;
      Debugger.updateHighlight(ctx.codeMirrorRef, state.highlight);
      if (!canContinue) {
        ctx.setIsComplete(true);
        ctx.setIsSteppingToView(false);
        return;
      }
      if (isAtView(interpreter)) {
        foundNextView = true;
        ctx.setIsSteppingToView(false);
        return;
      }
    }
  }

  private static atTargetIndex(
    interpreter: JSInterpreter,
    varId: string,
    targetIndex: number
  ): boolean {
    if (!isAtView(interpreter)) return false;
    const activeIndex = computationStore.activeIndices.get(varId);
    return activeIndex !== undefined && activeIndex === targetIndex;
  }

  private static completeStepToIndex(ctx: Execution): void {
    ctx.setIsSteppingToIndex(false);
    ctx.setTargetIndex(null);
  }
}
