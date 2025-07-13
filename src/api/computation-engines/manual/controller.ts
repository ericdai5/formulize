import { EditorView } from "@codemirror/view";

import { applyCue, updateAllVariables } from "../../../formula/stepHandler";
import { IEnvironment } from "../../../types/environment";
import { computationStore } from "../../computation";
import { ERROR_MESSAGES } from "./constants";
import { Debugger } from "./debug";
import { executionStore as ctx } from "./executionStore";
import {
  JSInterpreter,
  initializeInterpreter,
  isAtBlock,
  isAtView,
} from "./interpreter";
import { VariableExtractor } from "./variableExtractor";

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
    ctx.setLinkageMap(variableLinkage);

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
      if (ctx.historyIndex < ctx.history.length - 1) {
        // Behind in history, move forward in existing history
        const nextIndex = ctx.historyIndex + 1;
        ctx.setHistoryIndex(nextIndex);
        const next = ctx.history[nextIndex];
        Debugger.updateHighlight(ctx.codeMirrorRef, next.highlight);
      } else {
        // End of history, create new state
        const canContinue = ctx.interpreter.step();
        const next = Debugger.snapshot(
          ctx.interpreter,
          ctx.history.length,
          ctx.code
        );
        ctx.addToHistory(next);
        const nextIndex = ctx.historyIndex + 1;
        ctx.setHistoryIndex(nextIndex);
        Debugger.updateHighlight(ctx.codeMirrorRef, next.highlight);
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

  /**
   * Step backward in history by one step.
   */
  static stepBackward(): void {
    if (ctx.historyIndex <= 0) return;
    const prevIndex = ctx.historyIndex - 1;
    ctx.setHistoryIndex(prevIndex);
    const prev = ctx.history[prevIndex];
    Debugger.updateHighlight(ctx.codeMirrorRef, prev.highlight);
  }

  // ============================================================================
  // Step to Specific Destination
  // ============================================================================

  /**
   * Method to ensure we're at the end of history before executing new steps.
   * This is needed when the user is browsing through execution history and then
   * wants to continue forward execution from the current point.
   */
  static stepToNewest(): void {
    if (ctx.historyIndex >= ctx.history.length - 1) return;
    const endIndex = ctx.history.length - 1;
    ctx.setHistoryIndex(endIndex);
  }

  static stepToView(): void {
    if (!ctx.interpreter || ctx.isComplete) return;
    this.stepToNewest();
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

  static stepToNextBlock(): void {
    if (!ctx.interpreter || ctx.isComplete) return;
    this.stepToNewest();
    ctx.setIsSteppingToBlock(true);
    try {
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
          this.processVariableUpdates();
          return;
        }
      }
    } catch (err) {
      this.handleError(err);
      ctx.setIsSteppingToBlock(false);
    }
  }

  static stepToPrevBlock(): void {
    if (ctx.historyIndex <= 0) return;
    let foundPrevBlock = false;
    let prevIndex = ctx.historyIndex - 1;
    while (prevIndex >= 0 && !foundPrevBlock) {
      const atBlock = isAtBlock(ctx.history, prevIndex);
      if (atBlock) {
        foundPrevBlock = true;
        ctx.setHistoryIndex(prevIndex);
        const prev = ctx.history[prevIndex];
        Debugger.updateHighlight(ctx.codeMirrorRef, prev.highlight);
        return;
      }
      prevIndex = prevIndex - 1;
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
    let nextIndex = ctx.historyIndex;
    while (atSameView) {
      const canContinue = interpreter.step();
      const newState = Debugger.snapshot(
        interpreter,
        ctx.history.length,
        ctx.code
      );
      ctx.addToHistory(newState);
      nextIndex = nextIndex + 1;
      ctx.setHistoryIndex(nextIndex);
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
        this.processVariableUpdates();
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

  /**
   * Process variable updates and apply visual cues
   * This should be called when the interpreter stops at meaningful breakpoints
   */
  private static processVariableUpdates(): void {
    if (!ctx.interpreter) return;

    try {
      const stack =
        ctx.interpreter.getStateStack() as import("./interpreter").StackFrame[];
      const variables = VariableExtractor.extractVariables(
        ctx.interpreter,
        stack,
        ctx.code
      );
      const updatedVarIds = updateAllVariables(variables, ctx.linkageMap);

      console.log("Controller - updatedVarIds", updatedVarIds);

      if (updatedVarIds.size > 0) {
        requestAnimationFrame(() => {
          applyCue(updatedVarIds);
        });
      }
    } catch (err) {
      console.warn("Error processing variable updates:", err);
    }
  }
}
