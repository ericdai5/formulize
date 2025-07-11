import React, { useCallback, useEffect, useRef, useState } from "react";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import beautify from "js-beautify";
import {
  ChevronDown,
  ChevronUp,
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
import Timeline from "./timeline";
import { VariablesSection } from "./variable-section";

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
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(0);
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
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  const userViewCodeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  const [userCode, setUserCode] = useState<string>("");
  const [isInterpreterViewCollapsed, setIsInterpreterViewCollapsed] =
    useState(false);
  const [isUserViewCollapsed, setIsUserViewCollapsed] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [isVariablesSectionCollapsed, setIsVariablesSectionCollapsed] = useState(false);
  const toggleInterpreterViewCollapse = () => {
    setIsInterpreterViewCollapsed(!isInterpreterViewCollapsed);
  };

  const toggleUserViewCollapse = () => {
    setIsUserViewCollapsed(!isUserViewCollapsed);
  };

  const toggleTimelineCollapse = () => {
    setIsTimelineCollapsed(!isTimelineCollapsed);
  };

  const toggleVariablesSectionCollapse = () => {
    setIsVariablesSectionCollapsed(!isVariablesSectionCollapsed);
  };

  const getViewMaxHeight = () => {
    const interpreterOpen = !isInterpreterViewCollapsed;
    const userOpen = !isUserViewCollapsed;
    if (interpreterOpen && userOpen) {
      return "50%";
    } else if (interpreterOpen || userOpen) {
      return "100%";
    }
    return "auto";
  };

  const getDebugSectionMaxHeight = () => {
    const variablesOpen = !isVariablesSectionCollapsed;
    const timelineOpen = !isTimelineCollapsed;
    if (variablesOpen && timelineOpen) {
      return "50%";
    } else if (variablesOpen || timelineOpen) {
      return "100%";
    }
    return "auto";
  };

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

      // Set the user view code to the original manual function
      if (environment?.formulas?.[0]?.manual) {
        const manualFunction = environment.formulas[0].manual;
        // Extract the function body and format it nicely
        const functionString = manualFunction.toString();

        // Use js-beautify to format the code with proper indentation
        const formattedCode = beautify.js(functionString, {
          indent_size: 2,
          space_in_empty_paren: false,
          preserve_newlines: true,
          max_preserve_newlines: 2,
          brace_style: "collapse",
          keep_array_indentation: false,
        });

        setUserCode(formattedCode);
      }
    }
  }, [environment]);

  // Create a single execution context that stays current
  const executionContextRef = useRef<Execution | null>(null);

  // Update the execution context whenever state changes
  useEffect(() => {
    executionContextRef.current = {
      interpreter,
      code,
      environment,
      history,
      currentHistoryIndex,
      isComplete,
      isSteppingToView,
      isSteppingToIndex,
      targetIndex,
      autoPlayIntervalRef,
      codeMirrorRef,
      setInterpreter,
      setHistory,
      setCurrentHistoryIndex,
      setIsComplete,
      setError,
      setIsRunning,
      setIsSteppingToView,
      setIsSteppingToIndex,
      setTargetIndex,
    };
  }, [
    interpreter,
    code,
    environment,
    history,
    currentHistoryIndex,
    isComplete,
    isSteppingToView,
    isSteppingToIndex,
    targetIndex,
  ]);

  const handleRefresh = useCallback(() => {
    if (executionContextRef.current) {
      refresh(executionContextRef.current);
    }
  }, []);

  const handleStepForward = () => {
    if (executionContextRef.current) {
      stepForward(executionContextRef.current);
    }
  };

  const handleStepToIndex = useCallback(
    (variableId: string, targetIdx: number) => {
      if (executionContextRef.current) {
        stepToIndex(executionContextRef.current, variableId, targetIdx);
      }
    },
    []
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
    if (executionContextRef.current) {
      stepToView(executionContextRef.current);
    }
  };

  const handleStepBackward = () => {
    if (executionContextRef.current) {
      stepBackward(executionContextRef.current);
    }
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

  const currentState = history[currentHistoryIndex];
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

  // When browsing history, we can still use play/stepToView buttons as they auto-move to end
  // But only if execution isn't complete OR if we're not at the end of history yet
  const isBrowsingHistory = currentHistoryIndex < history.length - 1;
  const playStepToViewDisabled =
    !interpreter ||
    (isComplete && !isBrowsingHistory) ||
    isSteppingToView ||
    isSteppingToIndex;

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed top-0 right-0 h-full w-1/2 max-w-3xl bg-white z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
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
              currentHistoryIndex <= 0 ||
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
            disabled={playStepToViewDisabled}
            icon={Eye}
          >
            {views.length}
          </Button>
          <Button
            onClick={toggleAutoPlay}
            disabled={playStepToViewDisabled}
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
        <div className="flex-1 flex border-b overflow-hidden">
          {/* Code Editors Column */}
          <div className="w-1/2 border-r flex flex-col">
            {/* Interpreter View */}
            <div
              className={`flex flex-col border-b ${
                isInterpreterViewCollapsed ? "" : "flex-1"
              }`}
              style={{
                maxHeight: isInterpreterViewCollapsed
                  ? "auto"
                  : getViewMaxHeight(),
              }}
            >
              <div
                className={`px-4 py-2 bg-white font-medium flex items-center justify-between ${
                  isInterpreterViewCollapsed ? "" : "border-b"
                }`}
              >
                <span>Interpreter View</span>
                <button
                  onClick={toggleInterpreterViewCollapse}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={isInterpreterViewCollapsed ? "Expand" : "Collapse"}
                >
                  {isInterpreterViewCollapsed ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                </button>
              </div>
              {!isInterpreterViewCollapsed && (
                <CodeMirror
                  value={code}
                  readOnly
                  extensions={[javascript(), ...debugExtensions]}
                  style={{
                    fontSize: "14px",
                    fontFamily: "monospace",
                    height: "100%",
                    overflow: "auto",
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
                  editable={false}
                  ref={codeMirrorRef}
                />
              )}
            </div>

            {/* User View */}
            <div
              className={`flex flex-col ${isUserViewCollapsed ? "" : "flex-1"}`}
              style={{
                maxHeight: isUserViewCollapsed ? "auto" : getViewMaxHeight(),
              }}
            >
              <div className="px-4 py-2 bg-white border-b font-medium flex items-center justify-between">
                <span>User View</span>
                <button
                  onClick={toggleUserViewCollapse}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={isUserViewCollapsed ? "Expand" : "Collapse"}
                >
                  {isUserViewCollapsed ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                </button>
              </div>
              {!isUserViewCollapsed && (
                <CodeMirror
                  value={userCode}
                  onChange={(value) => setUserCode(value)}
                  extensions={[javascript(), ...debugExtensions]}
                  style={{
                    fontSize: "14px",
                    fontFamily: "monospace",
                    height: "100%",
                    overflow: "auto",
                  }}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: true,
                    allowMultipleSelections: false,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightSelectionMatches: true,
                    searchKeymap: true,
                  }}
                  ref={userViewCodeMirrorRef}
                />
              )}
            </div>
          </div>

          {/* Debug Info Column */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <VariablesSection 
              currentState={currentState} 
              isCollapsed={isVariablesSectionCollapsed}
              onToggleCollapse={toggleVariablesSectionCollapse}
              maxHeight={isVariablesSectionCollapsed ? "auto" : getDebugSectionMaxHeight()}
            />
            <Timeline
              history={history}
              currentHistoryIndex={currentHistoryIndex}
              hasSteps={hasSteps}
              isComplete={isComplete}
              isRunning={isRunning}
              isSteppingToView={isSteppingToView}
              isSteppingToIndex={isSteppingToIndex}
              targetIndex={targetIndex}
              lineNumber={
                currentState
                  ? code.substring(0, currentState.highlight.start).split("\n")
                      .length
                  : 1
              }
              isCollapsed={isTimelineCollapsed}
              onToggleCollapse={toggleTimelineCollapse}
              maxHeight={isTimelineCollapsed ? "auto" : getDebugSectionMaxHeight()}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default DebugModal;
