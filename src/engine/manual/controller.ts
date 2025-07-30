import { EditorView } from "@codemirror/view";

import {
  applyCue,
  updateAllVariables,
} from "../../rendering/interaction/step-handler";
import { computationStore } from "../../store/computation";
import { executionStore as ctx } from "../../store/execution";
import { IArrayControl } from "../../types/control";
import { IEnvironment } from "../../types/environment";
import { IStep } from "../../types/step";
import { extractViews } from "../../util/acorn";
import { ERROR_MESSAGES } from "./constants";
import { JSInterpreter, initializeInterpreter, isAtBlock } from "./interpreter";
import { Step } from "./step";

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

    // Execute all steps and build complete history
    this.executeAllSteps(interpreter);
  }

  /**
   * Helper function to restore variables from a historical state and apply visual cues.
   */
  private static updateVariables(state: IStep): void {
    if (state.variables && ctx.linkageMap) {
      const updatedVarIds = updateAllVariables(state.variables, ctx.linkageMap);
      if (updatedVarIds.size > 0) {
        requestAnimationFrame(() => {
          applyCue(updatedVarIds);
        });
      }
    }
  }

  /**
   * Helper function to navigate to a step: set index, highlight, and update variables.
   */
  private static step(index: number): void {
    ctx.setHistoryIndex(index);
    const state = ctx.history[index];
    Step.highlight(ctx.codeMirrorRef, state.highlight);
    this.updateVariables(state);

    // Set view descriptions if this step has them (i.e., it's a view point)
    if (state.viewDescriptions) {
      ctx.setCurrentViewDescriptions(state.viewDescriptions);
    } else {
      // Clear view descriptions if not at a view point
      ctx.setCurrentViewDescriptions({});
    }
  }

  /**
   * Execute the entire program and build complete execution history.
   * This simplifies navigation logic by pre-computing all states.
   */
  private static executeAllSteps(interpreter: JSInterpreter): void {
    const history = [];
    const viewPoints: number[] = []; // Track which step numbers are at view points
    const blockPoints: number[] = []; // Track which step numbers are at block points
    let stepNumber = 0;
    let canContinue = true;

    // Add initial state
    const initialState = Step.getState(interpreter, stepNumber, ctx.code);
    history.push(initialState);

    // Execute all steps until completion
    while (canContinue) {
      try {
        canContinue = interpreter.step();
        stepNumber++;
        const state = Step.getState(interpreter, stepNumber, ctx.code);

        history.push(state);

        // Mark block statements that come after view calls as view points
        // This way we highlight meaningful block execution points after views are evaluated
        if (isAtBlock(history, stepNumber) && stepNumber > 0) {
          // Check if the previous state was a view call
          const previousState = history[stepNumber - 1];
          if (previousState?.highlight) {
            const codeAtPrevious = ctx.code
              .substring(
                previousState.highlight.start,
                previousState.highlight.end
              )
              .trim();

            // Check if the previous statement was a view call
            if (codeAtPrevious.startsWith("view([")) {
              viewPoints.push(stepNumber);

              // Extract view descriptions from the view call
              const viewDescriptions =
                this.extractViewDescriptions(codeAtPrevious);
              if (Object.keys(viewDescriptions).length > 0) {
                // Add view descriptions to the current step
                state.viewDescriptions = viewDescriptions;
              }
            }
          }
        }
      } catch (err) {
        ctx.setError(`${ERROR_MESSAGES.EXECUTION_ERROR}: ${err}`);
        break;
      }
    }

    // Now identify block points by examining the complete history
    for (let i = 0; i < history.length; i++) {
      if (isAtBlock(history, i)) {
        blockPoints.push(i);
      }
    }

    // Store the points information
    ctx.setView(viewPoints);
    ctx.setBlock(blockPoints);

    // Set complete history and position at the beginning
    ctx.setHistory(history);
    ctx.setHistoryIndex(0);
    ctx.setIsComplete(true);
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
    if (ctx.historyIndex >= ctx.history.length - 1) return;
    const nextIndex = ctx.historyIndex + 1;
    this.step(nextIndex);
  }

  static stepBackward(): void {
    if (ctx.historyIndex <= 0) return;
    const prevIndex = ctx.historyIndex - 1;
    this.step(prevIndex);
  }

  static stepToIndex(index: number): void {
    if (index < 0 || index >= ctx.history.length) return;
    this.step(index);
  }

  // ============================================================================
  // Step to View
  // ============================================================================

  static stepToView(): void {
    if (ctx.historyIndex >= ctx.history.length - 1) return;
    const nextView = ctx.getNextView(ctx.historyIndex);
    if (nextView !== null) {
      this.step(nextView);
    }
  }

  // ============================================================================
  // Step to Block
  // ============================================================================

  static stepToNextBlock(): void {
    if (ctx.historyIndex >= ctx.history.length - 1) return;
    const nextBlock = ctx.getNextBlock(ctx.historyIndex);
    if (nextBlock !== null) {
      this.step(nextBlock);
    }
  }

  static stepToPrevBlock(): void {
    if (ctx.historyIndex <= 0) return;
    const prevBlock = ctx.getPrevBlock(ctx.historyIndex);
    if (prevBlock !== null) {
      this.step(prevBlock);
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

  private static atIndexInState(
    varId: string,
    targetIndex: number,
    state: IStep
  ): boolean {
    const variables = state.variables;

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

  /**
   * Extract view descriptions from a view() call string
   * Parses view([["varName", "description"]]) format
   * @param viewCode - The view call code string
   * @returns Record of variable names to descriptions
   */
  private static extractViewDescriptions(
    viewCode: string
  ): Record<string, string> {
    const descriptions: Record<string, string> = {};
    try {
      // Extract the array content from view([...])
      const match = viewCode.match(/view\(\[(.*)\]\)/s);
      if (!match) return descriptions;
      const arrayContent = match[1];
      // Parse individual variable-description pairs
      // Look for patterns like ["varName", "description"]
      const pairRegex = /\["([^"]+)",\s*"([^"]+)"\]/g;
      let pairMatch;
      while ((pairMatch = pairRegex.exec(arrayContent)) !== null) {
        const [, varName, description] = pairMatch;
        descriptions[varName] = description;
      }
    } catch (error) {
      console.error("Error extracting view descriptions:", error);
    }
    return descriptions;
  }
}
