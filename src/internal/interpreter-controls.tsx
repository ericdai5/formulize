import React from "react";

import { observer } from "mobx-react-lite";

import {
  Eye,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  X,
} from "lucide-react";

import { useFormulize } from "../core/hooks";
import {
  stepBackward,
  stepForward,
  toIndex,
  toNextBlock,
  toPrevBlock,
  toPrevView,
  toStep,
} from "../engine/manual/execute";
import Button from "../ui/button";
import Select from "../ui/select";

interface InterpreterControlsProps {
  onClose: () => void;
  onRefresh: () => void;
  onStepToIndex: (variableId: string, targetIdx: number) => void;
  onToggleAutoPlay: () => void;
}

const InterpreterControls: React.FC<InterpreterControlsProps> = observer(
  ({ onClose, onRefresh, onToggleAutoPlay }) => {
    const context = useFormulize();
    const computationStore = context?.computationStore;
    const executionStore = context?.executionStore;

    // Stores are now required - return null if not provided
    if (!executionStore || !computationStore) {
      return null;
    }
    const ctx = executionStore;
    const compStore = computationStore;

    // When browsing history, we can still use play/toStep buttons as they auto-move to end
    // But only if execution isn't complete OR if we're not at the end of history yet
    const isBrowsingHistory = ctx.historyIndex < ctx.history.length - 1;

    // Common disabled state conditions
    const isStepping = ctx.isToStep || ctx.isToIndex || ctx.isToBlock;
    const hasNoHistory = ctx.historyIndex <= 0;
    const atEndOfHistory = ctx.historyIndex >= ctx.history.length - 1;

    // Modularized disabled states for each button
    const refreshDisabled = ctx.isRunning || isStepping;
    const stepBackwardDisabled = hasNoHistory || ctx.isRunning || isStepping;
    const stepForwardDisabled = atEndOfHistory || ctx.isRunning || isStepping;
    const toPrevBlockDisabled = hasNoHistory || ctx.isRunning || isStepping;

    const playStepToStepDisabled =
      !ctx.interpreter ||
      (ctx.isComplete && !isBrowsingHistory) ||
      ctx.isToStep ||
      ctx.isToIndex ||
      ctx.isToBlock;

    const toBlockDisabled =
      !ctx.interpreter ||
      (ctx.isComplete && !isBrowsingHistory) ||
      ctx.isToStep ||
      ctx.isToIndex ||
      ctx.isToBlock;

    const handleStepBackward = () => {
      stepBackward(ctx, compStore);
    };

    const handleStepToNextBlock = () => {
      toNextBlock(ctx, compStore);
    };

    const handleStepToPrevBlock = () => {
      toPrevBlock(ctx, compStore);
    };

    const handleStepForward = () => {
      stepForward(ctx, compStore);
    };

    const handleStepToStep = () => {
      toStep(ctx, compStore);
    };

    return (
      <div className="flex justify-start items-center p-2 border-b gap-2">
        <Button onClick={onClose} icon={X} />
        <Button
          onClick={onRefresh}
          disabled={refreshDisabled}
          icon={RotateCcw}
        />
        <Button
          onClick={handleStepBackward}
          disabled={stepBackwardDisabled}
          icon={StepBack}
        />
        <Button
          onClick={handleStepForward}
          disabled={stepForwardDisabled}
          icon={StepForward}
        />
        <Button
          onClick={handleStepToPrevBlock}
          disabled={toPrevBlockDisabled}
          icon={SkipBack}
        />
        <Button
          onClick={handleStepToNextBlock}
          disabled={toBlockDisabled}
          icon={SkipForward}
        />
        <Button
          onClick={handleStepToStep}
          disabled={playStepToStepDisabled}
          icon={Eye}
        >
          {ctx.stepPoints.length}
        </Button>
        <Button
          onClick={onToggleAutoPlay}
          disabled={playStepToStepDisabled}
          icon={ctx.isRunning ? Pause : Play}
        />
        <Select
          value={ctx.autoPlaySpeed}
          onChange={(value) => ctx.setAutoPlaySpeed(Number(value))}
          options={[
            { value: 10, label: "10 ms" },
            { value: 30, label: "30 ms" },
            { value: 50, label: "50 ms" },
            { value: 100, label: "100 ms" },
            { value: 200, label: "200 ms" },
          ]}
        />
      </div>
    );
  }
);

export default InterpreterControls;

// Simplified Interpreter Controls for canvas nodes
export const SimplifiedInterpreterControls: React.FC = observer(() => {
  const context = useFormulize();
  const computationStore = context?.computationStore;
  const executionStore = context?.executionStore;

  // Stores are now required - return null if not provided
  if (!executionStore || !computationStore) {
    return null;
  }
  const ctx = executionStore;
  const compStore = computationStore;

  // Common disabled state conditions
  const isStepping = ctx.isToStep || ctx.isToIndex || ctx.isToBlock;

  const toBlockDisabled =
    !ctx.interpreter ||
    (ctx.isComplete && ctx.historyIndex >= ctx.history.length - 1) ||
    ctx.isToStep ||
    ctx.isToIndex ||
    ctx.isToBlock;

  const nextBlockDisabled =
    toBlockDisabled || ctx.getNextBlock(ctx.historyIndex) === null;

  const prevBlockDisabled =
    ctx.historyIndex <= 0 ||
    ctx.isRunning ||
    isStepping ||
    ctx.getPrevBlock(ctx.historyIndex) === null;

  const nextViewDisabled =
    toBlockDisabled || ctx.getNextView(ctx.historyIndex) === null;

  const prevViewDisabled =
    ctx.historyIndex <= 0 ||
    ctx.isRunning ||
    isStepping ||
    ctx.getPrevView(ctx.historyIndex) === null;

  const skipBackDisabled =
    ctx.isRunning ||
    isStepping ||
    (ctx.steppingMode === "view"
      ? ctx.stepPoints.length === 0 || ctx.historyIndex <= ctx.stepPoints[0]
      : ctx.blockPoints.length === 0 || ctx.historyIndex <= ctx.blockPoints[0]);

  const skipForwardDisabled =
    ctx.isRunning ||
    isStepping ||
    (ctx.steppingMode === "view"
      ? ctx.stepPoints.length === 0 ||
        ctx.historyIndex >= ctx.stepPoints[ctx.stepPoints.length - 1]
      : ctx.blockPoints.length === 0 ||
        ctx.historyIndex >= ctx.blockPoints[ctx.blockPoints.length - 1]);

  const handleSkipBack = () => {
    if (ctx.steppingMode === "view") {
      if (ctx.stepPoints.length > 0) toIndex(ctx.stepPoints[0], ctx, compStore);
    } else {
      if (ctx.blockPoints.length > 0)
        toIndex(ctx.blockPoints[0], ctx, compStore);
    }
  };

  const handleSkipForward = () => {
    if (ctx.steppingMode === "view") {
      if (ctx.stepPoints.length > 0)
        toIndex(ctx.stepPoints[ctx.stepPoints.length - 1], ctx, compStore);
    } else {
      if (ctx.blockPoints.length > 0)
        toIndex(ctx.blockPoints[ctx.blockPoints.length - 1], ctx, compStore);
    }
  };

  const handleStepNext = () => {
    if (ctx.steppingMode === "view") {
      toStep(ctx, compStore);
    } else {
      toNextBlock(ctx, compStore);
    }
  };

  const handleStepPrev = () => {
    if (ctx.steppingMode === "view") {
      toPrevView(ctx, compStore);
    } else {
      toPrevBlock(ctx, compStore);
    }
  };

  return (
    <div className="flex justify-start items-center pb-2 gap-2">
      <Button
        onClick={handleSkipBack}
        disabled={skipBackDisabled}
        icon={SkipBack}
      />
      <Button
        onClick={handleStepPrev}
        disabled={
          ctx.steppingMode === "view" ? prevViewDisabled : prevBlockDisabled
        }
        icon={StepBack}
      />
      <Button
        onClick={handleStepNext}
        disabled={
          ctx.steppingMode === "view" ? nextViewDisabled : nextBlockDisabled
        }
        icon={StepForward}
      />
      <Button
        onClick={handleSkipForward}
        disabled={skipForwardDisabled}
        icon={SkipForward}
      />
    </div>
  );
});
