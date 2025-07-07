import { EditorView } from "@codemirror/view";

import { IEnvironment } from "../../../types/environment";
import { computationStore } from "../../computation";
import { ERROR_MESSAGES } from "./constants";
import { DebugState, Debugger } from "./debug";
import { JSInterpreter, initializeInterpreter, isAtView } from "./interpreter";

export interface Execution {
  code: string;
  environment: IEnvironment | null;
  interpreter: JSInterpreter | null;
  history: DebugState[];
  isComplete: boolean;
  isSteppingToView: boolean;
  isSteppingToIndex: boolean;
  targetIndex: { varId: string; index: number } | null;
  autoPlayIntervalRef: React.MutableRefObject<number | null>;
  codeMirrorRef: React.MutableRefObject<unknown>;

  setInterpreter: (interpreter: JSInterpreter | null) => void;
  setHistory: React.Dispatch<React.SetStateAction<DebugState[]>>;
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
    const interpreter = initializeInterpreter(
      ctx.code,
      ctx.environment,
      ctx.setError
    );
    if (!interpreter) return;
    ctx.setInterpreter(interpreter);
    const initialState = Debugger.snapshot(interpreter, 0, ctx.code);
    ctx.setHistory([initialState]);
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
    ctx.setIsComplete(false);
    ctx.setError(null);
    ctx.setIsRunning(false);
    ctx.setIsSteppingToView(false);
    ctx.setIsSteppingToIndex(false);
    ctx.setTargetIndex(null);
    this.clearProcessedIndices();
    this.clearAutoPlay(ctx);
    this.resetCodeMirror(ctx);
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
      const canContinue = ctx.interpreter.step();
      const newState = Debugger.snapshot(
        ctx.interpreter,
        ctx.history.length,
        ctx.code
      );
      ctx.setHistory((prev) => [...prev, newState]);
      Debugger.updateHighlight(ctx.codeMirrorRef, newState.highlight);
      if (!canContinue) {
        this.finishExecution(ctx);
      }
      if (ctx.isSteppingToView && isAtView(ctx.interpreter)) {
        ctx.setIsSteppingToView(false);
      }
    } catch (err) {
      this.handleError(ctx, err);
    }
  }

  static stepBackward(ctx: Execution): void {
    if (ctx.history.length <= 1) return;
    const prevState = ctx.history[ctx.history.length - 2];
    Debugger.updateHighlight(ctx.codeMirrorRef, prevState.highlight);
  }

  // ============================================================================
  // Step to Specific Destination
  // ============================================================================

  static stepToView(ctx: Execution): void {
    if (!ctx.interpreter || ctx.isComplete) return;
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
    while (atSameView) {
      const canContinue = interpreter.step();
      const newState = Debugger.snapshot(
        interpreter,
        ctx.history.length,
        ctx.code
      );
      ctx.setHistory((prev) => [...prev, newState]);
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
    while (!foundNextView) {
      const canContinue = interpreter.step();
      const state = Debugger.snapshot(
        interpreter,
        ctx.history.length,
        ctx.code
      );
      ctx.setHistory((prev) => [...prev, state]);
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
