import React, { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { DebugState } from "../api/computation-engines/manual/execute";

interface TimelineProps {
  history: DebugState[];
  currentHistoryIndex: number;
  hasSteps: boolean;
  isComplete: boolean;
  isRunning: boolean;
  isSteppingToView: boolean;
  isSteppingToIndex: boolean;
  targetIndex: { varId: string; index: number } | null;
  lineNumber: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  maxHeight: string;
}

const Timeline: React.FC<TimelineProps> = ({
  history,
  currentHistoryIndex,
  hasSteps,
  isComplete,
  isRunning,
  isSteppingToView,
  isSteppingToIndex,
  targetIndex,
  lineNumber,
  isCollapsed,
  onToggleCollapse,
  maxHeight,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new items are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [history.length]);

  return (
    <div 
      className={`flex flex-col border-t ${
        isCollapsed ? "" : "flex-1"
      }`}
      style={{
        maxHeight: isCollapsed ? "auto" : maxHeight,
      }}
    >
      <div 
        className={`px-4 py-2 bg-white font-medium flex flex-row justify-between ${
          isCollapsed ? "" : "border-b border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2">
          Timeline
          {hasSteps && (
            <div className="text-slate-500 flex flex-row gap-2">
              <span>
                Step {currentHistoryIndex + 1} of {history.length}
              </span>
              {isComplete && <span className="text-green-600">Complete</span>}
              {isRunning && <span className="text-blue-600">Running...</span>}
              {isSteppingToView && (
                <span className="text-orange-600">Stepping to a View...</span>
              )}
              {isSteppingToIndex && targetIndex && (
                <span className="text-purple-600">
                  Stepping to {targetIndex.varId} index {targetIndex.index}...
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronUp size={16} />
          )}
        </button>
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        {history.map((state, index) => {
          return (
            <div
              key={index}
              className={`py-3 px-4 border-b border-slate-200 ${
                index === currentHistoryIndex ? "bg-blue-50" : ""
              }`}
            >
              <div
                className={`text-sm flex items-center gap-2 ${
                  index === currentHistoryIndex
                    ? "text-blue-800"
                    : "text-slate-600"
                }`}
              >
                <span className="font-semibold">{index + 1}</span>
                <span>
                  P: {state.highlight.start}-{state.highlight.end}
                </span>
                <span>L: {lineNumber}</span>
                <span>
                  {state.stackTrace.length > 0
                    ? state.stackTrace[state.stackTrace.length - 1]
                    : "-"}
                </span>
              </div>
            </div>
          );
        })}
          {history.length === 0 && (
            <div className="text-center text-gray-500 p-8">
              Initialize debugging to see execution steps
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Timeline;
