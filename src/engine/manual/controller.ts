import { EditorView } from "@codemirror/view";

import { applyCue, updateAllVariables } from "../../rendering/interaction/step-handler";
import { IArrayControl } from "../../types/control";
import { IEnvironment } from "../../types/environment";
import { extractViews } from "../../util/acorn";
import { computationStore } from "../../store/computation";
import { executionStore as ctx } from "../../api/execution";
import { ERROR_MESSAGES } from "./constants";
import { initializeInterpreter, isAtBlock, isAtView } from "./interpreter";
import { Step } from "./step";
import { VariableExtractor } from "./variableExtractor";

export const getArrayControl = (
  varId: string,
  environment?: IEnvironment | null
): IArrayControl | null => {
  const controls = environment?.controls || [];
  const config = controls.find((control) => control.variable === varId);
  return config?.type === "array" ? (config as IArrayControl) : null;
};

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

    // Extract views from the code in the beginning of the execution to always have them available
    // This is because if refresh is called, then views are no longer available
    const foundViews = extractViews(ctx.code);
    ctx.setViews(foundViews);

    const initialState = Step.getState(interpreter, 0, ctx.code);
    ctx.setHistory([initialState]);
    ctx.setHistoryIndex(0);
    Step.highlight(ctx.codeMirrorRef, initialState.highlight);
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
        Step.highlight(ctx.codeMirrorRef, next.highlight);
      } else {
        // End of history, create new state
        const canContinue = ctx.interpreter.step();
        const next = Step.getState(
          ctx.interpreter,
          ctx.history.length,
          ctx.code
        );
        ctx.addToHistory(next);
        const nextIndex = ctx.historyIndex + 1;
        ctx.setHistoryIndex(nextIndex);
        Step.highlight(ctx.codeMirrorRef, next.highlight);
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
    Step.highlight(ctx.codeMirrorRef, prev.highlight);
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
    const hasViewPoints = ctx.hasViews();
    try {
      const searching = true;
      while (searching) {
        if (this.atIndex(varId, targetIndex)) {
          this.completeStepToIndex();
          return;
        }
        if (hasViewPoints) {
          this.stepToView();
        } else {
          this.stepToNextBlock();
        }
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
        const state = Step.getState(interpreter, ctx.history.length, ctx.code);
        ctx.addToHistory(state);
        currentIndex = currentIndex + 1;
        ctx.setHistoryIndex(currentIndex);
        Step.highlight(ctx.codeMirrorRef, state.highlight);
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
        Step.highlight(ctx.codeMirrorRef, prev.highlight);
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
      const newState = Step.getState(interpreter, ctx.history.length, ctx.code);
      ctx.addToHistory(newState);
      nextIndex = nextIndex + 1;
      ctx.setHistoryIndex(nextIndex);
      Step.highlight(ctx.codeMirrorRef, newState.highlight);
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
      const state = Step.getState(interpreter, ctx.history.length, ctx.code);
      ctx.addToHistory(state);
      currentIndex = currentIndex + 1; // Track the correct index
      ctx.setHistoryIndex(currentIndex);
      Step.highlight(ctx.codeMirrorRef, state.highlight);
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

  private static atIndex(varId: string, targetIndex: number): boolean {
    if (!ctx.interpreter || !ctx.targetIndex || !ctx.currentState) {
      return false;
    }

    const variables = ctx.currentState.variables;

    // Get the array control configuration
    const array = getArrayControl(varId, ctx.environment);
    if (!array?.index) {
      return false;
    }

    // Check if the index variable has reached the target value
    const indexValue = variables[array.index];
    if (typeof indexValue !== "number" || indexValue !== targetIndex) {
      return false;
    }

    // Check if linked variable has expected value
    const linkedVar = ctx.getLinkedVar(varId);
    if (linkedVar && variables[linkedVar] !== undefined) {
      const variable = computationStore.variables.get(varId);
      const actualValue = variables[linkedVar];
      if (
        variable &&
        !this.isExpectedValue(variable, targetIndex, actualValue)
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validates that the current value matches what's expected at a specific array index
   * Ensures data consistency during execution
   * @param variable - The variable to check
   * @param indexValue - The index value to check
   * @param actualValue - The actual value to check
   * @returns True if the expected value matches the actual value, false otherwise
   */
  private static isExpectedValue(
    variable: { set?: unknown[] },
    indexValue: number,
    actualValue: unknown
  ): boolean {
    if (!variable?.set || !Array.isArray(variable.set)) {
      return false;
    }
    const expectedValue = variable.set[indexValue];
    return expectedValue === actualValue;
  }

  private static completeStepToIndex(): void {
    ctx.setIsSteppingToIndex(false);
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
