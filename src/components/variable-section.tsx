import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { DebugState } from "../api/computation-engines/manual/execute";

const DEBUG_VARIABLES = [
  "Interpreter Value",
  "Current Node Type",
  "Stack Depth",
  "Declared Variables",
  "Node Info",
  "Current Scope Type",
  "Current Function",
  "Error",
];

interface VariableSectionProps {
  title: string;
  count: number;
  colorScheme: "blue" | "green";
  children: React.ReactNode;
}

const VariableType: React.FC<VariableSectionProps> = ({
  title,
  count,
  colorScheme,
  children,
}) => {
  const colors = {
    blue: {
      header: "border-blue-200 bg-blue-50",
      titleText: "text-blue-800",
      countText: "text-blue-600",
    },
    green: {
      header: "border-green-200 bg-green-50",
      titleText: "text-green-800",
      countText: "text-green-600",
    },
  };

  return (
    <div>
      <div
        className={`flex flex-row justify-between px-4 py-2 font-medium border-b ${colors[colorScheme].header}`}
      >
        <div className={`font-medium ${colors[colorScheme].titleText}`}>
          {title}
        </div>
        <div className={colors[colorScheme].countText}>Qty: {count}</div>
      </div>
      {children}
    </div>
  );
};

interface CurrentVariablesSectionProps {
  currentState: DebugState | undefined;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  maxHeight: string;
}

const VariablesSection: React.FC<CurrentVariablesSectionProps> = ({
  currentState,
  isCollapsed,
  onToggleCollapse,
  maxHeight,
}) => {
  return (
    <>
      {/* Current Variables */}
      {currentState && (
        <div 
          className={`flex flex-col ${
            isCollapsed ? "" : "flex-1"
          }`}
          style={{
            maxHeight: isCollapsed ? "auto" : maxHeight,
          }}
        >
          <div 
            className={`flex flex-row justify-between px-4 py-2 font-medium bg-white ${
              isCollapsed ? "" : "border-b border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="font-medium">Variables</div>
              {currentState?.variables && (
                <div className="text-slate-500">
                  Qty: {Object.keys(currentState.variables).length}
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
            <div className="flex-1 overflow-y-auto">
            {Object.keys(currentState.variables).length > 0 ? (
              <div>
                {/* Variable Assignments - shown in blue boxes when variables are assigned */}
                {currentState &&
                  currentState.variableAssignments &&
                  currentState.variableAssignments.length > 0 && (
                    <VariableType
                      title="Variable Assignments"
                      count={currentState.variableAssignments.length}
                      colorScheme="blue"
                    >
                      {currentState.variableAssignments.map(
                        (assignment, index) => (
                          <div
                            key={index}
                            className="border-b border-blue-200 p-3 bg-blue-50"
                          >
                            <div className="flex items-center gap-2 font-mono text-sm font-semibold text-blue-800">
                              <span>{assignment.localVar}</span>
                              <span>→</span>
                              <span>{assignment.storeVar}</span>
                              <span>=</span>
                              <span className="break-all min-w-0 flex-1 bg-white px-2 py-1 rounded border border-blue-200">
                                {typeof assignment.value === "object"
                                  ? JSON.stringify(assignment.value)
                                  : String(assignment.value)}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </VariableType>
                  )}

                {/* View Variables - shown in green boxes when view() is called */}
                {currentState &&
                  currentState.viewVariables &&
                  Object.keys(currentState.viewVariables).length > 0 && (
                    <VariableType
                      title="View Variables"
                      count={Object.keys(currentState.viewVariables).length}
                      colorScheme="green"
                    >
                      {Object.entries(currentState.viewVariables).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="border-b border-green-200 p-3 bg-green-50"
                          >
                            <div className="flex items-center gap-2 font-mono text-sm text-green-800">
                              <span className="font-semibold">{key}</span>
                              <span>=</span>
                              <span className="break-all min-w-0 flex-1 bg-white px-2 py-1 rounded border border-green-200">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </VariableType>
                  )}

                {/* Display regular variables */}
                {Object.entries(currentState.variables)
                  .filter(([key]) => !DEBUG_VARIABLES.includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="border-b border-slate-200 p-3">
                      <div className="flex items-center gap-2 font-mono text-sm">
                        <span>{key}</span>
                        <span>=</span>
                        <span className="break-all min-w-0 flex-1">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </div>
                    </div>
                  ))}

                {/* Display debug info variables */}
                {Object.entries(currentState.variables)
                  .filter(([key]) => DEBUG_VARIABLES.includes(key))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-slate-50 border-b border-slate-200 p-2"
                    >
                      <div className="text-sm text-gray-600 break-words">
                        <span className="font-semibold">{key}:</span>
                        <div className="ml-2 font-mono mt-1 whitespace-pre-wrap break-all">
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              ) : (
                <div className="text-center text-gray-500 p-8">
                  No variables captured yet
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default VariableType;
export { VariablesSection };
