import { EditorView } from "@codemirror/view";

import { getVariablesFromLatexString } from "../../parse/variable";
import {
  applyCue,
  clearAllCues,
  updateAllVariables,
} from "../../rendering/interaction/step-handler";
import { ComputationStore } from "../../store/computation";
import { ExecutionStore } from "../../store/execution";
import { IArrayControl } from "../../types/control";
import { IEnvironment } from "../../types/environment";
import { IStep } from "../../types/step";
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

/**
 * The view function creates visualization breakpoints during manual computation.
 *
 * This is a stub export for TypeScript type checking purposes.
 * The actual implementation is injected at runtime by the interpreter,
 * which overrides this function within the execution context.
 *
 * @param description - Text description of what is being shown
 * @param options - Options object containing value, expression, and formulaId
 *
 * @example
 * view("Current sum:", { value: sum });
 * view("Processing element", { value: element, expression: "x_{i}" });
 * view("Loss value:", { value: loss, formulaId: "loss-function" });
 * view("Weight update:", { id: "weight-update", value: w_t });
 */
export function view(
  _description: string,
  _options?: {
    id?: string;
    value?: unknown;
    expression?: string;
    formulaId?: string
  }
): void {
  // This is a stub - the actual implementation is injected by the interpreter at runtime.
  // When called outside of the interpreter context, this is a no-op.
}

export class Controller {
  // ============================================================================
  // Execution Lifecycle Management
  // ============================================================================

  private static initializeExecution(
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
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
    // Auto-detect variable linkages from the code AST (use scoped store)
    const { variableLinkage: detectedLinkage } = extractLinkages(
      ctx.code,
      computationStore
    );
    // Merge with user-specified linkages (user-specified takes precedence)
    const specifiedLinkage = ctx.environment?.semantics?.variableLinkage;
    const variableLinkage = mergeLinkages(detectedLinkage, specifiedLinkage);
    ctx.setLinkageMap(variableLinkage);
    ctx.setInterpreter(interpreter);
    // Clear active variables at the start of execution
    ctx.setActiveVariables(new Set());
    // Execute all steps and build complete history
    this.executeAllSteps(interpreter, ctx);
  }

  /**
   * Helper function to restore variables from a historical state and apply visual cues.
   * @param state - The current step state
   * @param stepIndex - The current step index
   */
  private static updateVariables(
    state: IStep,
    stepIndex: number,
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    // Always clear all visual cues first to ensure clean state
    requestAnimationFrame(() => {
      clearAllCues();
    });
    if (state.variables && ctx.linkageMap && ctx.code) {
      // Get the formulaId from the current view (if specified)
      const formulaId = state.view?.formulaId;

      // If view has an expression, ONLY use that for highlighting (ignore code line)
      if (state.view?.expression) {
        // Clear any variables from code line, use only expression
        ctx.setActiveVariables(new Set());
        this.activateVarsFromExpression(
          state.view.expression,
          ctx,
          computationStore,
          formulaId
        );
      } else {
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
          currLine,
          computationStore,
          ctx
        );
        // Always store the active variables in the execution store (even if empty set)
        // This ensures labels only show for variables referenced on this line
        ctx.setActiveVariables(updatedVars);
        if (updatedVars.size > 0) {
          requestAnimationFrame(() => {
            applyCue(updatedVars, formulaId);
          });
        }
      }
    } else {
      // If no variables or linkage map, clear active variables
      ctx.setActiveVariables(new Set());
    }
  }

  /**
   * Helper function to navigate to a step: set index, highlight, and update variables.
   */
  private static step(
    index: number,
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    ctx.setHistoryIndex(index);
    const state = ctx.history[index];
    Step.highlight(ctx.codeMirrorRef, state.highlight);
    this.updateVariables(state, index, ctx, computationStore);
  }

  /**
   * Enrich activeVariables with variables contained in the expression string.
   * Filters out nested variables (memberOf parents and index variables) to only
   * highlight complete member variables, not their component parts.
   * @param formulaId - Optional formula ID to limit cues to a specific formula
   */
  private static activateVarsFromExpression(
    expression: string,
    ctx: ExecutionStore,
    computationStore: ComputationStore,
    formulaId?: string
  ): void {
    const unescaped = unescapeLatex(expression);
    const varIds = getVariablesFromLatexString(unescaped, computationStore);
    if (varIds.length === 0) return;

    // Filter out nested variables:
    // - Variables that are memberOf another variable (e.g., 'y' is memberOf 'y^{(i)}')
    // - Index variables that are used by member variables (e.g., 'i' in 'y^{(i)}')
    const filteredVarIds = varIds.filter((varId) => {
      const variable = computationStore.variables.get(varId);
      if (!variable) return false;

      // Skip if this variable is a memberOf parent (it's a component of a larger variable)
      // Check if any other variable in the expression has this as its memberOf
      for (const otherVarId of varIds) {
        const otherVar = computationStore.variables.get(otherVarId);
        if (otherVar?.memberOf === varId) {
          // This varId is the parent of another variable in the expression
          // Skip it - we want the complete member variable, not the parent part
          return false;
        }
      }

      // Skip if this is an index variable used by another variable in the expression
      if (variable.role === "index") {
        for (const otherVarId of varIds) {
          const otherVar = computationStore.variables.get(otherVarId);
          if (otherVar?.index === varId) {
            // This varId is used as an index by another variable
            // Skip it - we want the complete member variable, not the index
            return false;
          }
        }
      }

      return true;
    });

    if (filteredVarIds.length === 0) return;

    const allActive = new Set([...ctx.activeVariables, ...filteredVarIds]);
    ctx.setActiveVariables(allActive);
    requestAnimationFrame(() => {
      applyCue(allActive, formulaId);
    });
  }

  /**
   * Execute the entire program and build complete execution history.
   * This simplifies navigation logic by pre-computing all states.
   * Also captures variable snapshots at block points for proper state restoration.
   */
  private static executeAllSteps(
    interpreter: JSInterpreter,
    ctx: ExecutionStore
  ): void {
    const history = [];
    const viewPoints: number[] = []; // Track which step numbers are at view points
    const blockPoints: number[] = []; // Track which step numbers are at block points
    let stepNumber = 0;
    let canContinue = true;

    // Track pending view params captured from view() calls
    // The view() function may execute on step N, but we need to attach it to
    // the next block statement (step N+1 or later)
    let pendingView: {
      id?: string;
      description: string;
      value: unknown;
      expression?: string;
      formulaId?: string;
    } | null = null;

    // Clear previous first-seen values
    ctx.clearFirstSeenValues();

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

        // Check if a view() call was executed during this step
        // The view function captures its arguments when called
        const captured = interpreter._capturedView;
        if (captured) {
          // Store as pending - we'll attach to the next block statement
          pendingView = {
            id: captured.id,
            description: captured.description,
            value: captured.value,
            expression: captured.expression,
            formulaId: captured.formulaId,
          };
          // Clear the captured params to prevent processing the same view multiple times
          interpreter._capturedView = undefined;
        }

        // Capture first-seen values for linked variables
        if (state.variables && ctx.linkageMap) {
          for (const [localVar, varId] of Object.entries(ctx.linkageMap)) {
            // Skip multi-linkages
            if (Array.isArray(varId)) continue;
            const value = state.variables[localVar];
            if (typeof value === "number") {
              // setFirstSeenValue only sets if not already seen
              ctx.setFirstSeenValue(varId, value);
            }
          }
        }

        // Mark block statements that come after view calls as view points
        // This way we highlight meaningful block execution points after views are evaluated
        if (isAtBlock(history, stepNumber) && stepNumber > 0) {
          // Check if we have pending view params (from a previous view() call)
          if (pendingView) {
            viewPoints.push(stepNumber);
            // Build the view description with the actual variable value
            const valueStr =
              pendingView.value !== undefined ? String(pendingView.value) : "";
            const description = valueStr
              ? `${pendingView.description} ${valueStr}`
              : pendingView.description;
            state.view = {
              id: pendingView.id,
              description,
              expression: pendingView.expression,
              formulaId: pendingView.formulaId,
            };
            // Clear pending params after attaching to a block
            pendingView = null;
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

  static refresh(
    code: string,
    environment: IEnvironment | null,
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    ctx.reset();
    ctx.setCode(code);
    ctx.setEnvironment(environment);
    this.clearProcessedIndices(computationStore);
    this.clearAutoPlay(ctx);
    this.resetCodeMirror(ctx);

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
    this.initializeExecution(ctx, computationStore);
  }

  // ============================================================================
  // Singular Stepping
  // ============================================================================

  static stepForward(
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    if (ctx.historyIndex >= ctx.history.length - 1) return;
    const nextIndex = ctx.historyIndex + 1;
    this.step(nextIndex, ctx, computationStore);
  }

  static stepBackward(
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    if (ctx.historyIndex <= 0) return;
    const prevIndex = ctx.historyIndex - 1;
    this.step(prevIndex, ctx, computationStore);
  }

  static stepToIndex(
    index: number,
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    if (index < 0 || index >= ctx.history.length) return;
    this.step(index, ctx, computationStore);
  }

  // ============================================================================
  // Step to View
  // ============================================================================

  static stepToView(
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    if (ctx.historyIndex >= ctx.history.length - 1) return;
    const nextView = ctx.getNextView(ctx.historyIndex);
    if (nextView !== null) {
      this.step(nextView, ctx, computationStore);
    }
  }

  static stepToPrevView(
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    if (ctx.historyIndex <= 0) return;
    const prevView = ctx.getPrevView(ctx.historyIndex);
    if (prevView !== null) {
      this.step(prevView, ctx, computationStore);
    }
  }

  // ============================================================================
  // Step to Block
  // ============================================================================

  static stepToNextBlock(
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    if (ctx.historyIndex >= ctx.history.length - 1) return;
    const nextBlock = ctx.getNextBlock(ctx.historyIndex);
    if (nextBlock !== null) {
      this.step(nextBlock, ctx, computationStore);
    }
  }

  static stepToPrevBlock(
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    if (ctx.historyIndex <= 0) return;
    const prevBlock = ctx.getPrevBlock(ctx.historyIndex);
    if (prevBlock !== null) {
      this.step(prevBlock, ctx, computationStore);
    }
  }

  private static clearProcessedIndices(
    computationStore: ComputationStore
  ): void {
    computationStore.clearProcessedIndices();
  }

  private static clearAutoPlay(ctx: ExecutionStore): void {
    if (ctx.autoPlayIntervalRef.current) {
      clearInterval(ctx.autoPlayIntervalRef.current);
      ctx.autoPlayIntervalRef.current = null;
    }
  }

  private static resetCodeMirror(ctx: ExecutionStore): void {
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
}
