import React from "react";

import { observer } from "mobx-react-lite";

import { SimplifiedInterpreterControls } from "../internal/interpreter-controls";
import { useFormulize } from "./hooks";

export interface InterpreterControlProps {
  /** Optional className for additional styling */
  className?: string;
}

/**
 * An interpreter control component for step-through debugging
 * of manual functions. Must be used inside a FormulizeProvider.
 */
export const InterpreterControl: React.FC<InterpreterControlProps> = observer(
  ({ className = "" }) => {
    // Get the Formulize context - code is extracted and stored by FormulizeProvider
    const context = useFormulize();
    const executionStore = context?.executionStore ?? null;
    const isLoading = context?.isLoading ?? true;

    // Read userCode from the store (set by FormulizeProvider during initialization)
    const userCode = executionStore?.userCode ?? "";

    const containerStyle: React.CSSProperties = {
      width: "100%",
      overflow: "hidden",
    };

    // Show loading state while stores are being initialized
    if (!executionStore || (isLoading && !userCode)) {
      return (
        <div
          className={`border bg-white border-slate-200 rounded-lg shadow-sm p-4 ${className}`}
          style={containerStyle}
        >
          <div className="text-slate-500 text-sm">Loading...</div>
        </div>
      );
    }

    // Calculate progress based on stepping mode
    const points =
      executionStore.steppingMode === "view"
        ? executionStore.stepPoints
        : executionStore.blockPoints;
    const currentStepNumber = points.filter(
      (p) => p <= executionStore.historyIndex
    ).length;
    const totalSteps = points.length;
    const progress =
      totalSteps > 0 ? (currentStepNumber / totalSteps) * 100 : 0;

    return (
      <div className={className} style={containerStyle}>
        <SimplifiedInterpreterControls />
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

export default InterpreterControl;
