import { EditorView } from "@codemirror/view";

import {
  applyCue,
  clearAllCues,
} from "../../rendering/interaction/step-handler";
import { ComputationStore } from "../../store/computation";
import { ExecutionStore } from "../../store/execution";
import { IArrayControl } from "../../types/control";
import { IEnvironment } from "../../types/environment";
import { IStep } from "../../types/step";
import { IValue } from "../../types/variable";
import { ERROR_MESSAGES } from "./constants";
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
 * @param values - Record mapping LaTeX variable IDs to runtime values
 * @param options - Optional object with id, expression and formulaId
 *
 * @example
 * view("Current sum:", { "S": sum });
 * view("Processing element", { "x": xi, "X": xi }, { expression: "x_{i}" });
 * view("Loss value:", { "L": loss }, { formulaId: "loss-function" });
 * view("Final result:", { "E": result }, { expression: "\\sum_{i} x_i", formulaId: "main-formula" });
 * view("Weight update:", { "w": w }, { id: "weight-update", formulaId: "update-rule" });
 */
export function view(
  _description: string,
  _values?: Record<string, IValue>,
  _options?: { id?: string; expression?: string; formulaId?: string }
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
    ctx.setInterpreter(interpreter);
    // Clear active variables at the start of execution
    ctx.setActiveVariables(new Set());
    // Execute all steps and build complete history
    this.executeAllSteps(interpreter, ctx);
  }

  /**
   * Helper function to restore variables from a historical state and apply visual cues.
   * Uses explicit values from view() calls to update computation store variables.
   * @param state - The current step state
   * @param stepIndex - The current step index
   */
  private static updateVariables(
    state: IStep,
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    // Always clear all visual cues first to ensure clean state
    requestAnimationFrame(() => {
      clearAllCues();
    });
    // Get the formulaId from the current view (if specified)
    const formulaId = state.view?.formulaId;
    // If view has explicit values, update the computation store and highlight those variables
    if (state.view?.values) {
      const activeVarIds = new Set<string>();
      // Update each variable with its explicit value
      for (const [varId, value] of Object.entries(state.view.values)) {
        if (typeof value === "number" || Array.isArray(value)) {
          computationStore.setValueInStepMode(varId, value);
          activeVarIds.add(varId);
        }
      }
      ctx.setActiveVariables(activeVarIds);
      if (activeVarIds.size > 0) {
        requestAnimationFrame(() => {
          applyCue(activeVarIds, formulaId);
        });
      }
    } else {
      // No view or no values - clear active variables
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
    this.updateVariables(state, ctx, computationStore);
  }

  /*** CURRENTLY NOT USED BUT MAY BE USEFUL IN THE FUTURE ***
   * Enrich activeVariables with variables contained in the expression string.
   * @param formulaId - Optional formula ID to limit cues to a specific formula
   */
  // private static activateVarsFromExpression(
  //   expression: string,
  //   ctx: ExecutionStore,
  //   computationStore: ComputationStore,
  //   formulaId?: string
  // ): void {
  //   const unescaped = unescapeLatex(expression);
  //   const varIds = getVariablesFromLatexString(unescaped, computationStore);
  //   if (varIds.length === 0) return;
  //   const allActive = new Set([...ctx.activeVariables, ...varIds]);
  //   ctx.setActiveVariables(allActive);
  //   requestAnimationFrame(() => {
  //     applyCue(allActive, formulaId);
  //   });
  // }

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
      values?: Record<string, IValue>;
      expression?: string;
      formulaId?: string;
    } | null = null;

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
            values: captured.values,
            expression: captured.expression,
            formulaId: captured.formulaId,
          };
          // Clear the captured params to prevent processing the same view multiple times
          interpreter._capturedView = undefined;
        }
        // Mark block statements that come after view calls as view points
        // This way we highlight meaningful block execution points after views are evaluated
        if (isAtBlock(history, stepNumber) && stepNumber > 0) {
          // Check if we have pending view params (from a previous view() call)
          if (pendingView) {
            viewPoints.push(stepNumber);
            state.view = {
              id: pendingView.id,
              description: pendingView.description,
              values: pendingView.values,
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

    // Process extension configs to add items based on viewId and handle persistence
    ctx.processExtensions();

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
    // Preserve userCode before reset since it's set separately by FormulizeProvider
    const preservedUserCode = ctx.userCode;
    ctx.reset();
    ctx.setCode(code);
    ctx.setEnvironment(environment);
    // Restore userCode after reset
    if (preservedUserCode) {
      ctx.setUserCode(preservedUserCode);
    }
    this.clearProcessedIndices(computationStore);
    this.clearAutoPlay(ctx);
    this.resetCodeMirror(ctx);

    // Reset only input variables in computation store to their original values from environment
    // Computed variables should not be reset - they will be recomputed
    // Use setValueInStepMode action to comply with MobX strict mode
    if (environment?.variables) {
      for (const [varId, varDef] of Object.entries(environment.variables)) {
        if (
          computationStore.variables.has(varId) &&
          typeof varDef === "object" &&
          varDef.default !== undefined &&
          varDef.role !== "computed"
        ) {
          computationStore.setValueInStepMode(varId, varDef.default);
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
