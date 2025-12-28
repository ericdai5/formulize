import { EditorView } from "@codemirror/view";

import {
  applyCue,
  clearAllCues,
  updateAllVariables,
} from "../../rendering/interaction/step-handler";
import { computationStore } from "../../store/computation";
import { executionStore as ctx } from "../../store/execution";
import { IArrayControl } from "../../types/control";
import { IEnvironment } from "../../types/environment";
import { IStep } from "../../types/step";
import { extractViews } from "../../util/acorn";
import { ERROR_MESSAGES } from "./constants";
import { extractLinkages, mergeLinkages } from "./extract";
import { JSInterpreter, initializeInterpreter, isAtBlock } from "./interpreter";
import { Step } from "./step";

/**
 * Unescape a JSON-escaped string (e.g. "\\theta" -> "\theta")
 * Returns the original string if unescaping fails
 */
export const unescapeLatex = (str: string): string => {
  try {
    return JSON.parse(`"${str}"`);
  } catch {
    return str;
  }
};

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
    // Extract just the values from variables for the interpreter
    const variables = computationStore.getVariables();
    const values: Record<string, number | (string | number)[]> = {};
    for (const [key, variable] of Object.entries(variables)) {
      if (variable.value !== undefined) {
        values[key] = variable.value;
      }
    }
    const interpreter = initializeInterpreter(
      ctx.code,
      ctx.setError.bind(ctx),
      values
    );
    if (!interpreter) return;
    // Auto-detect variable linkages from the code AST
    const { variableLinkage: detectedLinkage } = extractLinkages(ctx.code);
    // Merge with user-specified linkages (user-specified takes precedence)
    const specifiedLinkage = ctx.environment?.semantics?.variableLinkage;
    const variableLinkage = mergeLinkages(detectedLinkage, specifiedLinkage);
    ctx.setLinkageMap(variableLinkage);
    ctx.setInterpreter(interpreter);
    // Clear active variables at the start of execution
    ctx.setActiveVariables(new Set());
    // Execute all steps and build complete history
    this.executeAllSteps(interpreter);
  }

  /**
   * Helper function to restore variables from a historical state and apply visual cues.
   * @param state - The current step state
   * @param stepIndex - The current step index
   */
  private static updateVariables(state: IStep, stepIndex: number): void {
    // Always clear all visual cues first to ensure clean state
    requestAnimationFrame(() => {
      clearAllCues();
    });
    if (state.variables && ctx.linkageMap && ctx.code) {
      // When at a block statement, use previous state's highlight to get user-visible code that was just executed
      let highlight = state.highlight;
      if (isAtBlock(ctx.history, stepIndex) && stepIndex > 0) {
        const prevState = ctx.history[stepIndex - 1];
        if (prevState?.highlight) {
          highlight = prevState.highlight;
        }
      }
      // Get the current line of code from the highlight positions
      const currLine = ctx.code.substring(highlight.start, highlight.end);
      const updatedVars = updateAllVariables(
        state.variables,
        ctx.linkageMap,
        currLine
      );
      // Always store the active variables in the execution store (even if empty set)
      // This ensures labels only show for variables referenced on this line
      ctx.setActiveVariables(updatedVars);
      if (updatedVars.size > 0) {
        requestAnimationFrame(() => {
          applyCue(updatedVars);
        });
      }
    } else {
      // If no variables or linkage map, clear active variables
      ctx.setActiveVariables(new Set());
    }
  }

  /**
   * Helper function to navigate to a step: set index, highlight, and update variables.
   */
  private static step(index: number): void {
    ctx.setHistoryIndex(index);
    const state = ctx.history[index];
    Step.highlight(ctx.codeMirrorRef, state.highlight);
    this.updateVariables(state, index);
    // Enrich active variables with expression scope variables if this step has a view
    if (state.view?.expression) {
      this.activateVarsFromExpression(state.view.expression);
    }
  }

  /**
   * Enrich activeVariables with variables contained in the expression string.
   * Parses the LaTeX expression to extract variable IDs for highlighting.
   */
  private static activateVarsFromExpression(expression: string): void {
    const unescaped = unescapeLatex(expression);
    const varIds = getVariablesFromLatexString(unescaped);
    if (varIds.length === 0) return;
    const allActive = new Set([...ctx.activeVariables, ...varIds]);
    ctx.setActiveVariables(allActive);
    requestAnimationFrame(() => {
      applyCue(allActive);
    });
  }

  /**
   * Execute the entire program and build complete execution history.
   * This simplifies navigation logic by pre-computing all states.
   * Also captures variable snapshots at block points for proper state restoration.
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
            if (codeAtPrevious.startsWith("view(")) {
              viewPoints.push(stepNumber);
              // Process the view call immediately with the current step's variables
              const view = this.extractView(codeAtPrevious, state.variables);
              if (view) {
                state.view = view;
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

    // Clear all active variables and visual cues for the initial state
    ctx.setActiveVariables(new Set());
    requestAnimationFrame(() => {
      clearAllCues();
    });
  }

  static refresh(code: string, environment: IEnvironment | null): void {
    ctx.reset();
    ctx.setCode(code);
    ctx.setEnvironment(environment);
    this.clearProcessedIndices();
    this.clearAutoPlay();
    this.resetCodeMirror();

    // Reset variables in computation store to their original values from environment
    if (environment?.variables) {
      for (const [varId, varDef] of Object.entries(environment.variables)) {
        const computationVar = computationStore.variables.get(varId);
        if (computationVar && typeof varDef === "object") {
          // Reset the value if defined in environment (using "default" property)
          if (varDef.default !== undefined) {
            computationVar.value = varDef.default;
          } else if (varDef.memberOf) {
            // For memberOf variables, clear the value (it will be set during execution)
            computationVar.value = undefined;
          }
        }
      }
    }

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

  static stepToPrevView(): void {
    if (ctx.historyIndex <= 0) return;
    const prevView = ctx.getPrevView(ctx.historyIndex);
    if (prevView !== null) {
      this.step(prevView);
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

  /**
   * Get variable value from step variables with error handling
   * @param variableName - Name of the variable to look up
   * @param stepVariables - Variables from the current step
   * @returns Variable value or error message
   */
  private static getValueString(
    variableName: string,
    variables: Record<string, unknown>
  ): string {
    try {
      if (variables[variableName] !== undefined) {
        return String(variables[variableName]);
      } else {
        return `(${variableName} not found)`;
      }
    } catch (error) {
      console.warn(
        `Error extracting variable value for ${variableName}:`,
        error
      );
      return `(error reading ${variableName})`;
    }
  }

  /**
   * Extract view from a view() call string
   * Parses formats:
   *   view("description", variableName)
   *   view("description", variableName, "expression")
   * @param viewCode - The view call code string
   * @param stepVariables - Optional step variables to extract variable values from
   * @returns IView or null if parsing fails
   */
  private static extractView(
    viewCode: string,
    stepVariables?: Record<string, unknown>
  ): IView | null {
    try {
      // Parse format: view("description", variableName) or view("description", variableName, "scope")
      const matchWithScope = viewCode.match(
        /view\("([^"]+)",\s*([a-zA-Z_][a-zA-Z0-9_]*)(?:,\s*"([^"]+)")?\)/
      );
      if (!matchWithScope) return null;
      const [, rawDescription, variableName, expressionScope] = matchWithScope;
      const description = unescapeLatex(rawDescription);

      // Build final description with variable value if available
      let finalDescription = description;
      if (variableName && stepVariables) {
        const variableValue = this.getValueString(variableName, stepVariables);
        finalDescription = `${description} ${variableValue}`;
      }

      return {
        varId: variableName,
        description: finalDescription,
        expression: expressionScope || undefined,
      };
    } catch (error) {
      console.error("Error extracting view description:", error);
      return null;
    }
  }
}
