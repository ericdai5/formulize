import React from "react";

import { observer } from "mobx-react-lite";

import {
  Code,
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
  stepToIndex,
  stepToNextBlock,
  stepToPrevBlock,
  stepToPrevView,
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
          {ctx.viewPoints.length}
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

// Simplified Interpreter Controls for canvas nodes
interface SimplifiedInterpreterControlsProps {
  onToggleCode?: () => void;
  showCode?: boolean;
}

export const SimplifiedInterpreterControls: React.FC<SimplifiedInterpreterControlsProps> =
  observer(({ onToggleCode, showCode }) => {
    // Common disabled state conditions
    const isStepping =
      ctx.isSteppingToView || ctx.isSteppingToIndex || ctx.isSteppingToBlock;

    const stepToBlockDisabled =
      !ctx.interpreter ||
      (ctx.isComplete && ctx.historyIndex >= ctx.history.length - 1) ||
      ctx.isSteppingToView ||
      ctx.isSteppingToIndex ||
      ctx.isSteppingToBlock;

    const nextBlockDisabled =
      stepToBlockDisabled || ctx.getNextBlock(ctx.historyIndex) === null;

    const prevBlockDisabled =
      ctx.historyIndex <= 0 ||
      ctx.isRunning ||
      isStepping ||
      ctx.getPrevBlock(ctx.historyIndex) === null;

    const nextViewDisabled =
      stepToBlockDisabled || ctx.getNextView(ctx.historyIndex) === null;

    const prevViewDisabled =
      ctx.historyIndex <= 0 ||
      ctx.isRunning ||
      isStepping ||
      ctx.getPrevView(ctx.historyIndex) === null;

    const skipBackDisabled =
      ctx.isRunning ||
      isStepping ||
      (ctx.steppingMode === "view"
        ? ctx.viewPoints.length === 0 || ctx.historyIndex <= ctx.viewPoints[0]
        : ctx.blockPoints.length === 0 ||
          ctx.historyIndex <= ctx.blockPoints[0]);

    const skipForwardDisabled =
      ctx.isRunning ||
      isStepping ||
      (ctx.steppingMode === "view"
        ? ctx.viewPoints.length === 0 ||
          ctx.historyIndex >= ctx.viewPoints[ctx.viewPoints.length - 1]
        : ctx.blockPoints.length === 0 ||
          ctx.historyIndex >= ctx.blockPoints[ctx.blockPoints.length - 1]);

    const handleSkipBack = () => {
      if (ctx.steppingMode === "view") {
        if (ctx.viewPoints.length > 0) stepToIndex(ctx.viewPoints[0]);
      } else {
        if (ctx.blockPoints.length > 0) stepToIndex(ctx.blockPoints[0]);
      }
    };

    const handleSkipForward = () => {
      if (ctx.steppingMode === "view") {
        if (ctx.viewPoints.length > 0)
          stepToIndex(ctx.viewPoints[ctx.viewPoints.length - 1]);
      } else {
        if (ctx.blockPoints.length > 0)
          stepToIndex(ctx.blockPoints[ctx.blockPoints.length - 1]);
      }
    };

    const handleStepNext = () => {
      if (ctx.steppingMode === "view") {
        stepToView();
      } else {
        stepToNextBlock();
      }
    };

    const handleStepPrev = () => {
      if (ctx.steppingMode === "view") {
        stepToPrevView();
      } else {
        stepToPrevBlock();
      }
    };

    return (
      <div
        className={`flex justify-start items-center p-2 gap-2 ${showCode ? "border-b border-slate-200" : ""}`}
      >
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
        {onToggleCode && <Button onClick={onToggleCode} icon={Code} />}
        {showCode && (
          <div className="relative flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-28 h-9">
            <div
              className={`absolute h-[calc(100%-4px)] w-[calc(50%-2px)] bg-white rounded-[10px] shadow-sm transition-transform duration-200 ease-in-out ${
                ctx.steppingMode === "view"
                  ? "translate-x-0"
                  : "translate-x-full"
              }`}
            />
            <button
              onClick={() => ctx.setSteppingMode("view")}
              className={`relative z-10 flex-1 h-full flex items-center justify-center text-xs font-medium transition-colors duration-200 ${
                ctx.steppingMode === "view"
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              View
            </button>
            <button
              onClick={() => ctx.setSteppingMode("line")}
              className={`relative z-10 flex-1 h-full flex items-center justify-center text-xs font-medium transition-colors duration-200 ${
                ctx.steppingMode === "line"
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Line
            </button>
          </div>
        )}
      </div>
    );
  });
