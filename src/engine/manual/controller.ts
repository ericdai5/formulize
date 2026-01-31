import { EditorView } from "@codemirror/view";

import { ComputationStore } from "../../store/computation";
import { ExecutionStore } from "../../store/execution";
import { IArrayControl } from "../../types/control";
import { IEnvironment } from "../../types/environment";
import { IInterpreterStep, IStep, IStepInput } from "../../types/step";
import { applyCue, clearAllCues } from "../../util/step-handler";
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
 * The step function creates visualization breakpoints during manual computation.
 *
 * This is a stub export for TypeScript type checking purposes.
 * The actual implementation is injected at runtime by the interpreter,
 * which overrides this function within the execution context.
 *
 * @param input - Either a single step (applies to all formulas) or multiple steps keyed by formulaId
 * @param id - Optional step-level identifier
 *
 * @example Single/all formulas:
 * step({ description: "Current sum: $S$", values: [["S", sum]] });
 *
 * @example With expression highlighting:
 * step({ description: "MSE", values: [["L", loss]], expression: "\\frac{1}{m}" });
 *
 * @example Multi-formula (keyed by formulaId):
 * step({
 *   "loss-function": { description: "Loss", values: [["L", L]] },
 *   "gradient": { description: "Gradient", values: [["\\nabla L", nablaL]] }
 * });
 *
 * @example With step-level id:
 * step({
 *   "update-rule": { description: "Weight update", values: [["w", w]], expression: "w_{t+1}" }
 * }, "weight-update");
 */
export function step(_input: IStepInput, _id?: string): void {
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
    ctx.setActiveVariables(new Map());
    // Execute all steps and build complete history
    this.executeAllSteps(interpreter, ctx);
  }

  /**
   * Helper function to restore variables from a historical state and apply visual cues.
   * Uses explicit values from step() calls to update computation store variables.
   * Supports multi-formula views where each formula can have its own values.
   * @param state - The current step state
   * @param stepIndex - The current step index
   */
  private static updateVariables(
    state: IInterpreterStep,
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    // Always clear all visual cues first to ensure clean state
    requestAnimationFrame(() => {
      clearAllCues();
    });

    // If no step or no formulas, clear active variables
    if (!state.step?.formulas) {
      ctx.setActiveVariables(new Map());
      return;
    }

    // Build per-formula active variables map
    const activeVarsMap = new Map<string, Set<string>>();

    // Collect values from all formula views and update computation store
    for (const [formulaId, view] of Object.entries(state.step.formulas)) {
      if (view.values) {
        const varIds = new Set<string>();
        for (const [varId, value] of view.values) {
          if (typeof value === "number" || Array.isArray(value)) {
            computationStore.setValueInStepMode(varId, value);
            varIds.add(varId);
          }
        }
        if (varIds.size > 0) {
          activeVarsMap.set(formulaId, varIds);
        }
      }
    }

    ctx.setActiveVariables(activeVarsMap);

    if (activeVarsMap.size > 0) {
      requestAnimationFrame(() => {
        // Apply cues per formula
        for (const [formulaId, varIds] of activeVarsMap.entries()) {
          // Empty string formulaId means "all formulas" - pass undefined
          applyCue(varIds, formulaId || undefined);
        }
      });
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
    const stepPoints: number[] = []; // Track which step numbers are at step points
    const blockPoints: number[] = []; // Track which step numbers are at block points
    let stepNumber = 0;
    let canContinue = true;

    // Track pending step params captured from step() calls
    // The step() function may execute on step N, but we need to attach it to
    // the next block statement (step N+1 or later)
    let pendingStep: IStep | null = null;

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
        // Check if a step() call was executed during this step
        // The step function captures its arguments when called
        const captured = interpreter._capturedStep;
        if (captured) {
          // Store as pending - we'll attach to the next block statement
          // The captured step is already in the normalized IStep format
          pendingStep = captured;
          // Clear the captured params to prevent processing the same step multiple times
          interpreter._capturedStep = undefined;
        }
        // Mark block statements that come after step calls as step points
        // This way we highlight meaningful block execution points after steps are evaluated
        if (isAtBlock(history, stepNumber) && stepNumber > 0) {
          // Check if we have pending step params (from a previous step() call)
          if (pendingStep) {
            stepPoints.push(stepNumber);
            state.step = pendingStep;
            // Clear pending params after attaching to a block
            pendingStep = null;
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
    ctx.setStep(stepPoints);
    ctx.setBlock(blockPoints);

    // Set complete history and position at the beginning
    ctx.setHistory(history);
    ctx.setHistoryIndex(0);
    ctx.setIsComplete(true);

    // Process extension configs to add items based on viewId and handle persistence
    ctx.processExtensions();

    // Clear all active variables and visual cues for the initial state
    ctx.setActiveVariables(new Map());
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

  static toIndex(
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

  static toStep(ctx: ExecutionStore, computationStore: ComputationStore): void {
    if (ctx.historyIndex >= ctx.history.length - 1) return;
    const nextView = ctx.getNextView(ctx.historyIndex);
    if (nextView !== null) {
      this.step(nextView, ctx, computationStore);
    }
  }

  static toPrevView(
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

  static toNextBlock(
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    if (ctx.historyIndex >= ctx.history.length - 1) return;
    const nextBlock = ctx.getNextBlock(ctx.historyIndex);
    if (nextBlock !== null) {
      this.step(nextBlock, ctx, computationStore);
    }
  }

  static toPrevBlock(
    ctx: ExecutionStore,
    computationStore: ComputationStore
  ): void {
    if (ctx.historyIndex <= 0) return;
    const prevBlock = ctx.getPrevBlock(ctx.historyIndex);
    if (prevBlock !== null) {
      this.step(prevBlock, ctx, computationStore);
    }
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
