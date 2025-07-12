import { EditorView } from "@codemirror/view";

import { IEnvironment } from "../../../types/environment";
import { computationStore } from "../../computation";
import { Connector } from "./connector";
import { ERROR_MESSAGES } from "./constants";
import { Debugger } from "./debug";
import { executionStore as ctx } from "./executionStore";
import {
  JSInterpreter,
  initializeInterpreter,
  isAtBlock,
  isAtView,
} from "./interpreter";

export class Controller {
  // ============================================================================
  // Execution Lifecycle Management
  // ============================================================================

  private static initializeExecution(): void {
    const variables = computationStore.getVariables();
    const interpreter = initializeInterpreter(
      ctx.code,
      ctx.setError.bind(ctx),
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
    ctx.setHistoryIndex(0);
    Debugger.updateHighlight(ctx.codeMirrorRef, initialState.highlight);
  }

  private static finishExecution(): void {
    ctx.setIsComplete(true);
    ctx.setIsRunning(false);
    ctx.setIsSteppingToView(false);
    ctx.setIsSteppingToIndex(false);
    ctx.setIsSteppingToBlock(false);
    this.clearAutoPlay();
  }

  static refresh(code: string, environment: IEnvironment | null): void {
    ctx.reset();
    ctx.setCode(code);
    ctx.setEnvironment(environment);
    this.clearProcessedIndices();
    this.clearAutoPlay();
    this.resetCodeMirror();

    // Clear variable linkage tracker
    Connector.clearAssignments();

    if (!code.trim()) {
      ctx.setError(ERROR_MESSAGES.NO_CODE);
      return;
    }
    this.initializeExecution();
  }

  // ============================================================================
  // Singular Stepping
  // ============================================================================

  static stepForward(): void {
    if (!ctx.interpreter || ctx.isComplete) return;
    try {
      // Check if we're at the end of history or behind
      if (ctx.historyIndex < ctx.history.length - 1) {
        // We're behind in history, just move forward in existing history
        const newIndex = ctx.historyIndex + 1;
        ctx.setHistoryIndex(newIndex);
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
        ctx.addToHistory(newState);
        const newIndex = ctx.historyIndex + 1; // Increment from current index
        ctx.setHistoryIndex(newIndex);
        Debugger.updateHighlight(ctx.codeMirrorRef, newState.highlight);
        if (!canContinue) {
          this.finishExecution();
        }
      }

      if (ctx.isSteppingToView && isAtView(ctx.interpreter)) {
        ctx.setIsSteppingToView(false);
      }

      if (ctx.isSteppingToBlock && isAtBlock(ctx.history, ctx.historyIndex)) {
        ctx.setIsSteppingToBlock(false);
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  // Helper method to ensure we're at the end of history before executing new steps
  static moveToEndOfHistory(): void {
    if (ctx.historyIndex < ctx.history.length - 1) {
      ctx.setHistoryIndex(ctx.history.length - 1);
    }
  }

  static stepBackward(): void {
    if (ctx.historyIndex <= 0) return;
    // Decrement the history index
    const newIndex = ctx.historyIndex - 1;
    ctx.setHistoryIndex(newIndex);
    // Get the state at the new index
    const prevState = ctx.history[newIndex];
    // Update highlight to show the previous state
    Debugger.updateHighlight(ctx.codeMirrorRef, prevState.highlight);
  }

  // ============================================================================
  // Step to Specific Destination
  // ============================================================================

  static stepToView(): void {
    if (!ctx.interpreter || ctx.isComplete) return;

    // If we're browsing history, move to the end first
    if (ctx.historyIndex < ctx.history.length - 1) {
      const endIndex = ctx.history.length - 1;
      ctx.setHistoryIndex(endIndex);
    }

    ctx.setIsSteppingToView(true);
    try {
      this.stepPastCurrentView();
      if (ctx.isComplete) {
        ctx.setIsSteppingToView(false);
        return;
      }
      this.stepToNextView();
    } catch (err) {
      this.handleError(err);
      ctx.setIsSteppingToView(false);
    }
  }

  static stepToIndex(varId: string, targetIndex: number): void {
    if (!ctx.interpreter || ctx.isComplete) return;
    ctx.setIsSteppingToIndex(true);
    ctx.setTargetIndex({ varId, index: targetIndex });
    try {
      const searching = true;
      while (searching) {
        if (this.atTargetIndex(ctx.interpreter, varId, targetIndex)) {
          this.completeStepToIndex();
          return;
        }
        this.stepToView();
        if (ctx.isComplete) {
          this.completeStepToIndex();
          return;
        }
      }
    } catch (err) {
      this.handleError(err);
      this.completeStepToIndex();
    }
  }

  static stepToBlock(): void {
    if (!ctx.interpreter || ctx.isComplete) return;

    // If we're browsing history, move to the end first
    if (ctx.historyIndex < ctx.history.length - 1) {
      const endIndex = ctx.history.length - 1;
      ctx.setHistoryIndex(endIndex);
    }

    ctx.setIsSteppingToBlock(true);
    try {
      this.stepToNextBlock();
    } catch (err) {
      this.handleError(err);
      ctx.setIsSteppingToBlock(false);
    }
  }

  private static clearProcessedIndices(): void {
    computationStore.clearProcessedIndices();
  }

  private static clearAutoPlay(): void {
    if (ctx.autoPlayIntervalRef.current) {
      clearInterval(ctx.autoPlayIntervalRef.current);
      ctx.autoPlayIntervalRef.current = null;
    }
  }

  private static resetCodeMirror(): void {
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

  private static handleError(err: unknown): void {
    ctx.setError(`${ERROR_MESSAGES.EXECUTION_ERROR}: ${err}`);
    ctx.setIsRunning(false);
    ctx.setIsSteppingToView(false);
    ctx.setIsSteppingToIndex(false);
    ctx.setIsSteppingToBlock(false);
    this.clearAutoPlay();
  }

  private static stepPastCurrentView(): void {
    if (!ctx.interpreter || !isAtView(ctx.interpreter)) {
      return;
    }
    let atSameView = true;
    const interpreter = ctx.interpreter;
    let currentIndex = ctx.historyIndex;
    while (atSameView) {
      const canContinue = interpreter.step();
      const newState = Debugger.snapshot(
        interpreter,
        ctx.history.length,
        ctx.code
      );
      ctx.addToHistory(newState);
      currentIndex = currentIndex + 1; // Track the correct index
      ctx.setHistoryIndex(currentIndex);
      Debugger.updateHighlight(ctx.codeMirrorRef, newState.highlight);
      if (!canContinue) {
        ctx.setIsComplete(true);
        return;
      }
      atSameView = isAtView(interpreter);
    }
  }

  private static stepToNextView(): void {
    if (!ctx.interpreter) return;
    let foundNextView = false;
    const interpreter = ctx.interpreter;
    let currentIndex = ctx.historyIndex;
    while (!foundNextView) {
      const canContinue = interpreter.step();
      const state = Debugger.snapshot(
        interpreter,
        ctx.history.length,
        ctx.code
      );
      ctx.addToHistory(state);
      currentIndex = currentIndex + 1; // Track the correct index
      ctx.setHistoryIndex(currentIndex);
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

  private static stepToNextBlock(): void {
    if (!ctx.interpreter) return;
    let foundNextBlock = false;
    const interpreter = ctx.interpreter;
    let currentIndex = ctx.historyIndex;

    while (!foundNextBlock) {
      const canContinue = interpreter.step();
      const state = Debugger.snapshot(
        interpreter,
        ctx.history.length,
        ctx.code
      );

      ctx.addToHistory(state);
      currentIndex = currentIndex + 1;
      ctx.setHistoryIndex(currentIndex);
      Debugger.updateHighlight(ctx.codeMirrorRef, state.highlight);

      if (!canContinue) {
        ctx.setIsComplete(true);
        ctx.setIsSteppingToBlock(false);
        return;
      }

      const atBlock = isAtBlock(ctx.history, currentIndex);

      if (atBlock) {
        foundNextBlock = true;
        ctx.setIsSteppingToBlock(false);
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

  private static completeStepToIndex(): void {
    ctx.setIsSteppingToIndex(false);
    ctx.setTargetIndex(null);
  }
}
