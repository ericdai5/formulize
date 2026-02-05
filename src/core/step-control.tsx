import React from "react";

import { observer } from "mobx-react-lite";

import { SkipBack, SkipForward, StepBack, StepForward } from "lucide-react";

import { goToEnd, goToStart, nextStep, prevStep } from "../engine/controller";
import Button from "../ui/button";
import { useFormulize } from "./hooks";

export interface StepControlProps {
  /** Optional className for additional styling */
  className?: string;
}

/**
 * A step control component for navigating through collected steps.
 * Uses the new reactive step system. Must be used inside a FormulizeProvider.
 */
export const StepControl: React.FC<StepControlProps> = observer(
  ({ className = "" }) => {
    const context = useFormulize();
    const computationStore = context?.computationStore ?? null;
    const isLoading = context?.isLoading ?? true;

    const containerStyle: React.CSSProperties = {
      width: "100%",
      overflow: "hidden",
    };

    // Show loading state while stores are being initialized
    if (!computationStore || isLoading) {
      return (
        <div
          className={`border bg-white border-slate-200 rounded-lg shadow-sm p-4 ${className}`}
          style={containerStyle}
        >
          <div className="text-slate-500 text-sm">Loading...</div>
        </div>
      );
    }

    // Calculate progress
    const progress = computationStore.stepProgress;

    // Navigation handlers
    const handlePrevStep = () => {
      prevStep(computationStore);
    };

    const handleNextStep = () => {
      nextStep(computationStore);
    };

    const handleGoToStart = () => {
      goToStart(computationStore);
    };

    const handleGoToEnd = () => {
      goToEnd(computationStore);
    };

    return (
      <div className={className} style={containerStyle}>
        <div className="flex justify-start items-center pb-2 gap-2">
          <Button
            onClick={handleGoToStart}
            disabled={computationStore.isAtStart}
            icon={SkipBack}
          />
          <Button
            onClick={handlePrevStep}
            disabled={computationStore.isAtStart}
            icon={StepBack}
          />
          <Button
            onClick={handleNextStep}
            disabled={computationStore.isAtEnd}
            icon={StepForward}
          />
          <Button
            onClick={handleGoToEnd}
            disabled={computationStore.isAtEnd}
            icon={SkipForward}
          />
          <span className="text-sm text-slate-500 ml-2">
            {computationStore.totalSteps > 0
              ? `${computationStore.currentStepIndex + 1} / ${computationStore.totalSteps}`
              : "No steps"}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }
);

export default StepControl;
