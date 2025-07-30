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

import {
  stepBackward,
  stepForward,
  stepToNextBlock,
  stepToPrevBlock,
  stepToView,
} from "../engine/manual/execute";
import { executionStore as ctx } from "../store/execution";
import Button from "./button";
import Select from "./select";

interface InterpreterControlsProps {
  onClose: () => void;
  onRefresh: () => void;
  onStepToIndex: (variableId: string, targetIdx: number) => void;
  onToggleAutoPlay: () => void;
}

const InterpreterControls: React.FC<InterpreterControlsProps> = observer(
  ({ onClose, onRefresh, onToggleAutoPlay }) => {
    // When browsing history, we can still use play/stepToView buttons as they auto-move to end
    // But only if execution isn't complete OR if we're not at the end of history yet
    const isBrowsingHistory = ctx.historyIndex < ctx.history.length - 1;

    // Common disabled state conditions
    const isStepping =
      ctx.isSteppingToView || ctx.isSteppingToIndex || ctx.isSteppingToBlock;
    const hasNoHistory = ctx.historyIndex <= 0;
    const atEndOfHistory = ctx.historyIndex >= ctx.history.length - 1;

    // Modularized disabled states for each button
    const refreshDisabled = ctx.isRunning || isStepping;
    const stepBackwardDisabled = hasNoHistory || ctx.isRunning || isStepping;
    const stepForwardDisabled = atEndOfHistory || ctx.isRunning || isStepping;
    const stepToPrevBlockDisabled = hasNoHistory || ctx.isRunning || isStepping;

    const playStepToViewDisabled =
      !ctx.interpreter ||
      (ctx.isComplete && !isBrowsingHistory) ||
      ctx.isSteppingToView ||
      ctx.isSteppingToIndex;

    const stepToBlockDisabled =
      !ctx.interpreter ||
      (ctx.isComplete && !isBrowsingHistory) ||
      ctx.isSteppingToView ||
      ctx.isSteppingToIndex ||
      ctx.isSteppingToBlock;

    const handleStepBackward = () => {
      stepBackward();
    };

    const handleStepToNextBlock = () => {
      stepToNextBlock();
    };

    const handleStepToPrevBlock = () => {
      stepToPrevBlock();
    };

    const handleStepForward = () => {
      stepForward();
    };

    const handleStepToView = () => {
      stepToView();
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
          disabled={stepToPrevBlockDisabled}
          icon={SkipBack}
        />
        <Button
          onClick={handleStepToNextBlock}
          disabled={stepToBlockDisabled}
          icon={SkipForward}
        />
        <Button
          onClick={handleStepToView}
          disabled={playStepToViewDisabled}
          icon={Eye}
        >
          {ctx.views.length}
        </Button>
        <Button
          onClick={onToggleAutoPlay}
          disabled={playStepToViewDisabled}
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
