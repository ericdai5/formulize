import React from "react";

import { observer } from "mobx-react-lite";

import { RotateCcw, X } from "lucide-react";

import { useStore } from "../core/hooks";
import { StepControl } from "../core/step-control";
import { goToStep, refresh } from "../engine/controller";
import Button from "../ui/button";
import CollapsibleSection from "../ui/collapsible-section";

interface StepViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Simplified step viewer modal for viewing collected steps.
 * Removes CodeMirror/JS code highlighting - uses the reactive step system.
 */
const StepViewer: React.FC<StepViewerProps> = observer(
  ({ isOpen, onClose }) => {
    const context = useStore();
    const computationStore = context?.computationStore;

    // Guard: stores must be available
    if (!computationStore) {
      return null;
    }

    const handleRefresh = () => {
      refresh(computationStore);
    };

    const handleStepClick = (index: number) => {
      goToStep(index, computationStore);
    };

    const currentStep = computationStore.currentStep;

    return (
      <div
        className={`h-full bg-white border-l border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? "w-80" : "w-0"
        } overflow-hidden`}
      >
        {/* Header Controls */}
        <div className="min-w-80 border-b p-2">
          <div className="flex justify-start items-center gap-2">
            <Button onClick={onClose} icon={X} />
            <Button onClick={handleRefresh} icon={RotateCcw} />
          </div>
        </div>
        {/* Step Navigation */}
        <div className="min-w-80 p-2 border-b">
          <StepControl />
        </div>
        {/* Error Display */}
        {computationStore.stepError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-2 rounded text-sm min-w-80">
            <strong>Error:</strong> {computationStore.stepError}
          </div>
        )}
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-80">
          {/* Current Step Details */}
          <CollapsibleSection
            title="Current Step"
            isCollapsed={false}
            onToggleCollapse={() => {}}
          >
            {currentStep ? (
              <div className="space-y-2 p-2">
                {currentStep.id && (
                  <div className="text-xs text-slate-400">
                    ID: {currentStep.id}
                  </div>
                )}
                <div className="text-sm font-medium">
                  {currentStep.description}
                </div>
                {currentStep.values && currentStep.values.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-slate-500 mb-1">Values:</div>
                    <div className="space-y-1">
                      {currentStep.values.map(([varId, value], i) => (
                        <div
                          key={i}
                          className="text-sm font-mono bg-slate-50 px-2 py-1 rounded"
                        >
                          {varId} = {JSON.stringify(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {currentStep.expression && (
                  <div className="mt-2">
                    <div className="text-xs text-slate-500 mb-1">
                      Expression:
                    </div>
                    <div className="text-sm font-mono bg-slate-50 px-2 py-1 rounded">
                      {currentStep.expression}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No step selected</div>
            )}
          </CollapsibleSection>
          {/* Step List */}
          <CollapsibleSection
            title="All Steps"
            isCollapsed={false}
            onToggleCollapse={() => {}}
          >
            <div className="space-y-1 max-h-64 p-2 overflow-y-auto">
              {computationStore.steps.map((step, index) => (
                <div
                  key={index}
                  onClick={() => handleStepClick(index)}
                  className={`p-2 rounded cursor-pointer text-sm ${
                    index === computationStore.currentStepIndex
                      ? "bg-blue-100 border border-blue-300"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-normal">
                    {index + 1}. {step.description.substring(0, 50)}
                    {step.description.length > 50 ? "..." : ""}
                  </div>
                  {step.id && (
                    <div className="text-xs text-slate-400">ID: {step.id}</div>
                  )}
                </div>
              ))}
              {computationStore.steps.length === 0 && (
                <div className="text-sm text-slate-500 p-2">
                  No steps collected. Add step() calls to your semantics
                  function.
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    );
  }
);

// Export with both names for backward compatibility
export { StepViewer as DebugModal };
export default StepViewer;
