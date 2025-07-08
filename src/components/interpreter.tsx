import React, { useCallback, useEffect, useRef, useState } from "react";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import {
  Eye,
  Pause,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
  X,
} from "lucide-react";

import { computationStore } from "../api/computation";
import {
  DebugState,
  Execution,
  refresh,
  stepBackward,
  stepForward,
  stepToIndex,
  stepToView,
} from "../api/computation-engines/manual/execute";
import { extractManual } from "../api/computation-engines/manual/extract";
import { JSInterpreter } from "../api/computation-engines/manual/interpreter";
import { IEnvironment } from "../types/environment";
import { extractViews } from "../util/acorn";
import {
  addArrowMarker,
  addLineMarker,
  clearArrowMarkers,
  clearLineMarkers,
  debugExtensions,
} from "../util/codeMirrorExtensions";
import Button from "./button";
import Select from "./select";

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment | null;
}

// DebugState is now imported from execute.ts

const DebugModal: React.FC<DebugModalProps> = ({
  isOpen,
  onClose,
  environment,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(500);
  const [interpreter, setInterpreter] = useState<JSInterpreter | null>(null);
  const [code, setCode] = useState<string>("");
  const [history, setHistory] = useState<DebugState[]>([]);
  const [views, setViews] = useState<
    Array<{ start: number; end: number; line?: number; column?: number }>
  >([]);
  const [isSteppingToView, setIsSteppingToView] = useState(false);
  const [isSteppingToIndex, setIsSteppingToIndex] = useState(false);
  const [targetIndex, setTargetIndex] = useState<{
    varId: string;
    index: number;
  } | null>(null);
  const autoPlayIntervalRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const codeMirrorRef = useRef<any>(null);

  // Functions to control line markers and arrow gutter markers
  const setCurrentLine = useCallback((line: number) => {
    if (codeMirrorRef.current?.view) {
      const view = codeMirrorRef.current.view;
      view.dispatch({
        effects: [
          clearLineMarkers.of(null),
          addLineMarker.of({ line }),
          clearArrowMarkers.of(null),
          addArrowMarker.of({ line }),
        ],
      });
    }
  }, []);

  const clearCurrentLine = useCallback(() => {
    if (codeMirrorRef.current?.view) {
      const view = codeMirrorRef.current.view;
      view.dispatch({
        effects: [clearLineMarkers.of(null), clearArrowMarkers.of(null)],
      });
    }
  }, []);

  // Initialize interpreter and code when environment changes
  useEffect(() => {
    const result = extractManual(environment);
    if (result.isLoading) {
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.code) {
      setCode(result.code);
      const foundViews = extractViews(result.code);
      setViews(foundViews);
      // Clear previous errors
      setError(null);
    }
  }, [environment]);

  // Create execution context
  const createExecutionContext = useCallback(
    (): Execution => ({
      interpreter,
      code,
      environment,
      history,
      isComplete,
      isSteppingToView,
      isSteppingToIndex,
      targetIndex,
      autoPlayIntervalRef,
      codeMirrorRef,
      setInterpreter,
      setHistory,
      setIsComplete,
      setError,
      setIsRunning,
      setIsSteppingToView,
      setIsSteppingToIndex,
      setTargetIndex,
    }),
    [
      interpreter,
      code,
      environment,
      history,
      isComplete,
      isSteppingToView,
      isSteppingToIndex,
      targetIndex,
      setInterpreter,
      setHistory,
      setIsComplete,
      setError,
      setIsRunning,
      setIsSteppingToView,
      setIsSteppingToIndex,
      setTargetIndex,
    ]
  );

  const handleRefresh = useCallback(() => {
    refresh(createExecutionContext());
  }, [createExecutionContext]);

  const handleStepForward = () => {
    stepForward(createExecutionContext());
  };

  const handleStepToIndex = useCallback(
    (variableId: string, targetIdx: number) => {
      const context = createExecutionContext();
      stepToIndex(context, variableId, targetIdx);
    },
    [createExecutionContext]
  );

  // Register stepToIndex callback when component mounts
  useEffect(() => {
    computationStore.setStepToIndexCallback(handleStepToIndex);
    computationStore.setRefreshCallback(handleRefresh);
    return () => {
      computationStore.setStepToIndexCallback(null);
      computationStore.setRefreshCallback(null);
    };
  }, [handleStepToIndex, handleRefresh]);

  const handleStepToView = () => {
    stepToView(createExecutionContext());
  };

  const handleStepBackward = () => {
    stepBackward(createExecutionContext());
  };

  // Toggle auto-play
  const toggleAutoPlay = () => {
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
      setIsRunning(false);
    } else {
      setIsRunning(true);
      autoPlayIntervalRef.current = setInterval(() => {
        handleStepForward();
      }, autoPlaySpeed);
    }
  };

  const currentState = history[history.length - 1];
  const hasSteps = history.length > 0;

  // Update line marker when current state changes
  useEffect(() => {
    if (currentState?.highlight) {
      // Convert character position to line number
      const lines = code.substring(0, currentState.highlight.start).split("\n");
      const currentLine = lines.length - 1; // 0-based line number
      setCurrentLine(currentLine);
    } else {
      clearCurrentLine();
    }
  }, [currentState, code, setCurrentLine, clearCurrentLine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, []);

  // Debug button state - now checking for view() functions instead of comment breakpoints
  const buttonDisabled =
    !interpreter || isComplete || isSteppingToView || isSteppingToIndex;

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed top-0 right-0 h-full w-1/2 max-w-3xl bg-white z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Controls Header */}
        <div className="flex justify-start items-center p-2 border-b gap-2">
          <Button onClick={onClose} icon={X} />
          <Button
            onClick={handleRefresh}
            disabled={isRunning || isSteppingToView || isSteppingToIndex}
            icon={RotateCcw}
          />
          <Button
            onClick={handleStepBackward}
            disabled={
              history.length <= 1 ||
              isRunning ||
              isSteppingToView ||
              isSteppingToIndex
            }
            icon={StepBack}
          />
          <Button
            onClick={handleStepForward}
            disabled={
              !interpreter ||
              isRunning ||
              isComplete ||
              isSteppingToView ||
              isSteppingToIndex
            }
            icon={StepForward}
          />
          <Button
            onClick={handleStepToView}
            disabled={buttonDisabled}
            icon={Eye}
          >
            {views.length}
          </Button>
          <Button
            onClick={toggleAutoPlay}
            disabled={
              !interpreter ||
              isComplete ||
              isSteppingToView ||
              isSteppingToIndex
            }
            icon={isRunning ? Pause : Play}
          />
          <Select
            value={autoPlaySpeed}
            onChange={(value) => setAutoPlaySpeed(Number(value))}
            options={[
              { value: 100, label: "100 ms" },
              { value: 300, label: "300 ms" },
              { value: 500, label: "500 ms" },
              { value: 1000, label: "1 s" },
              { value: 2000, label: "2 s" },
            ]}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-2 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Code with Highlighting */}
          <div className="w-1/2 border-r flex flex-col">
            <CodeMirror
              value={code}
              readOnly
              extensions={[javascript(), ...debugExtensions]}
              style={{
                fontSize: "14px",
                fontFamily: "monospace",
                height: "100%",
              }}
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: false,
                bracketMatching: true,
                closeBrackets: false,
                autocompletion: false,
                highlightSelectionMatches: false,
                searchKeymap: false,
              }}
              ref={codeMirrorRef}
            />
          </div>

          {/* Debug Info */}
          <div className="w-1/2 flex flex-col">
            {/* View Variables - shown in green boxes when view() is called */}
            {currentState &&
              currentState.viewVariables &&
              Object.keys(currentState.viewVariables).length > 0 && (
                <div>
                  <div className="flex flex-row justify-between px-4 py-2 font-medium border-b border-green-200 bg-green-100">
                    <div className="font-medium text-green-800">
                      View Variables
                    </div>
                    <div className="text-green-600">
                      Qty: {Object.keys(currentState.viewVariables).length}
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-32">
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
                  </div>
                </div>
              )}

            {/* Current Variables */}
            {currentState && (
              <div className="border-b max-h-1/2">
                <div className="flex flex-row justify-between px-4 py-2 font-medium border-b border-slate-200">
                  <div className="font-medium">Variables</div>
                  {currentState?.variables && (
                    <div className="text-slate-500">
                      Qty: {Object.keys(currentState.variables).length}
                    </div>
                  )}
                </div>
                <div className="overflow-y-auto max-h-64">
                  {Object.keys(currentState.variables).length > 0 ? (
                    <div>
                      {/* Display regular variables */}
                      {Object.entries(currentState.variables)
                        .filter(([key]) => {
                          const debugVariables = [
                            "Interpreter Value",
                            "Current Node Type",
                            "Stack Depth",
                            "Declared Variables",
                            "Node Info",
                            "Current Scope Type",
                            "Current Function",
                            "Error",
                          ];
                          return !debugVariables.includes(key);
                        })
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="border-b border-slate-200 p-3"
                          >
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
                        .filter(([key]) => {
                          const debugVariables = [
                            "Interpreter Value",
                            "Current Node Type",
                            "Stack Depth",
                            "Declared Variables",
                            "Node Info",
                            "Current Scope Type",
                            "Current Function",
                            "Error",
                          ];
                          return debugVariables.includes(key);
                        })
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
              </div>
            )}

            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 border-b border-slate-200 font-medium flex flex-row justify-between">
                Timeline
                {hasSteps && (
                  <div className="text-slate-500 flex flex-row gap-2">
                    <span>Step {history.length}</span>
                    {isComplete && (
                      <span className="text-green-600">Complete</span>
                    )}
                    {isRunning && (
                      <span className="text-blue-600">Running...</span>
                    )}
                    {isSteppingToView && (
                      <span className="text-orange-600">
                        Stepping to a View...
                      </span>
                    )}
                    {isSteppingToIndex && targetIndex && (
                      <span className="text-purple-600">
                        Stepping to {targetIndex.varId} index{" "}
                        {targetIndex.index}...
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto max-h-96">
                {history.map((state, index) => {
                  return (
                    <div
                      key={index}
                      className={`py-3 px-4 border-b border-slate-200`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-sm gap-2 flex">
                          <span className="font-medium">Step {index}</span>
                          {index === history.length - 1 && (
                            <span className="text-blue-600">← Current</span>
                          )}
                          <span>
                            Pos: {state.highlight.start}-{state.highlight.end}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(state.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      {state.stackTrace.length > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          {state.stackTrace[state.stackTrace.length - 1]}
                        </div>
                      )}
                    </div>
                  );
                })}
                {history.length === 0 && (
                  <div className="text-center text-gray-500 p-8">
                    Initialize debugging to see execution steps
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DebugModal;
