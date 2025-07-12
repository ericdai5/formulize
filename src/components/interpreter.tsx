import React, { useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import beautify from "js-beautify";
import {
  Eye,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  StepBack,
  StepForward,
  X,
} from "lucide-react";

import { computationStore } from "../api/computation";
import { Debugger } from "../api/computation-engines/manual/debug";
import {
  refresh,
  stepBackward,
  stepForward,
  stepToBlock,
  stepToIndex,
  stepToView,
} from "../api/computation-engines/manual/execute";
import { executionStore as ctx } from "../api/computation-engines/manual/executionStore";
import { extractManual } from "../api/computation-engines/manual/extract";
import { isAtBlock } from "../api/computation-engines/manual/interpreter";
import { IEnvironment } from "../types/environment";
import { extractViews } from "../util/acorn";
import {
  addArrowMarker,
  addLineMarker,
  clearArrowMarkers,
  clearLineMarkers,
  debugExtensions,
} from "../util/codeMirrorExtensions";
import { CodeMirrorSetup, CodeMirrorStyle } from "../util/codemirror";
import Button from "./button";
import CollapsibleSection from "./collapsible-section";
import Select from "./select";
import Timeline from "./timeline";
import { VariablesSection } from "./variable-section";

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment | null;
}

// DebugState is now imported from execute.ts

const DebugModal: React.FC<DebugModalProps> = observer(
  ({ isOpen, onClose, environment }) => {
    // Only keep UI-specific state that doesn't belong in ctx
    const userViewCodeMirrorRef = useRef<ReactCodeMirrorRef>(null);
    const [userCode, setUserCode] = useState<string>("");
    const [isInterpreterViewCollapsed, setIsInterpreterViewCollapsed] =
      useState(false);
    const [isUserViewCollapsed, setIsUserViewCollapsed] = useState(false);
    const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
    const [isVariablesSectionCollapsed, setIsVariablesSectionCollapsed] =
      useState(false);
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

    // Functions to control line markers and arrow gutter markers
    const setCurrentLine = useCallback((line: number) => {
      if (ctx.codeMirrorRef.current?.view) {
        const view = ctx.codeMirrorRef.current.view;
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
      if (ctx.codeMirrorRef.current?.view) {
        const view = ctx.codeMirrorRef.current.view;
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
        ctx.setError(result.error);
        return;
      }
      if (result.code) {
        ctx.setCode(result.code);
        ctx.setEnvironment(environment);
        const foundViews = extractViews(result.code);
        ctx.setViews(foundViews);
        // Clear previous ctx.errors
        ctx.setError(null);

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

    // Helper function to clear markers in the user view CodeMirror
    const clearUserViewLine = useCallback(() => {
      if (userViewCodeMirrorRef.current?.view) {
        const view = userViewCodeMirrorRef.current.view;
        view.dispatch({
          effects: [clearLineMarkers.of(null), clearArrowMarkers.of(null)],
        });
      }
    }, []);

    const handleRefresh = useCallback(() => {
      clearUserViewLine();
      refresh(ctx.code, ctx.environment);
    }, [clearUserViewLine]);

    const handleStepForward = () => {
      stepForward();
    };

    const handleStepToIndex = useCallback(
      (variableId: string, targetIdx: number) => {
        stepToIndex(variableId, targetIdx);
      },
      []
    );

    const handleStepBackward = () => {
      stepBackward();
    };

    const handleStepToBlock = () => {
      stepToBlock();
    };

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
      stepToView();
    };

    // Toggle auto-play
    const toggleAutoPlay = () => {
      if (ctx.autoPlayIntervalRef.current) {
        clearInterval(ctx.autoPlayIntervalRef.current);
        ctx.autoPlayIntervalRef.current = null;
        ctx.setIsRunning(false);
      } else {
        ctx.setIsRunning(true);
        ctx.autoPlayIntervalRef.current = setInterval(() => {
          handleStepForward();
        }, ctx.autoPlaySpeed);
      }
    };

    // Helper function to convert character position to line number
    const getLineFromCharPosition = useCallback(
      (code: string, charPosition: number): number => {
        const lines = code.substring(0, charPosition).split("\n");
        return lines.length - 1; // 0-based line number
      },
      []
    );

    // Helper function to highlight a line in the user view CodeMirror using debug extensions
    const highlightUserViewLine = useCallback((lineNumber: number) => {
      if (userViewCodeMirrorRef.current?.view) {
        const view = userViewCodeMirrorRef.current.view;
        view.dispatch({
          effects: [
            clearLineMarkers.of(null),
            addLineMarker.of({ line: lineNumber }),
            clearArrowMarkers.of(null),
            addArrowMarker.of({ line: lineNumber }),
          ],
          scrollIntoView: true,
        });
      }
    }, []);

    // Handle clicking on timeline items to travel to that point in history
    const handleTimelineItemClick = useCallback(
      (index: number) => {
        if (index >= 0 && index < ctx.history.length) {
          ctx.setHistoryIndex(index);
          const state = ctx.history[index];
          if (state?.highlight) {
            const currentLine = getLineFromCharPosition(
              ctx.code,
              state.highlight.start
            );
            setCurrentLine(currentLine);
            // Also update the code highlighting
            Debugger.updateHighlight(ctx.codeMirrorRef, state.highlight);

            // Check if we should highlight the user view
            if (isAtBlock(ctx.history, index) && index > 0) {
              const previousState = ctx.history[index - 1];
              if (previousState?.highlight) {
                const previousLine = getLineFromCharPosition(
                  userCode,
                  previousState.highlight.start
                );
                highlightUserViewLine(previousLine);
              }
            }
          }
        }
      },
      [setCurrentLine, getLineFromCharPosition, userCode, highlightUserViewLine]
    );

    const currentState = ctx.history[ctx.historyIndex];

    // Update line marker when current state changes
    useEffect(() => {
      if (currentState?.highlight) {
        const currentLine = getLineFromCharPosition(
          ctx.code,
          currentState.highlight.start
        );
        setCurrentLine(currentLine);

        // Check if we should highlight the user view
        if (isAtBlock(ctx.history, ctx.historyIndex) && ctx.historyIndex > 0) {
          const previousState = ctx.history[ctx.historyIndex - 1];
          if (previousState?.highlight) {
            const previousLine = getLineFromCharPosition(
              userCode,
              previousState.highlight.start
            );
            highlightUserViewLine(previousLine);
          }
        }
      } else {
        clearCurrentLine();
        clearUserViewLine();
      }
    }, [
      currentState,
      setCurrentLine,
      clearCurrentLine,
      clearUserViewLine,
      getLineFromCharPosition,
      userCode,
      highlightUserViewLine,
    ]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (ctx.autoPlayIntervalRef.current) {
          clearInterval(ctx.autoPlayIntervalRef.current);
        }
      };
    }, []);

    // When browsing history, we can still use play/stepToView buttons as they auto-move to end
    // But only if execution isn't complete OR if we're not at the end of history yet
    const isBrowsingHistory = ctx.historyIndex < ctx.history.length - 1;
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
              disabled={
                ctx.isRunning ||
                ctx.isSteppingToView ||
                ctx.isSteppingToIndex ||
                ctx.isSteppingToBlock
              }
              icon={RotateCcw}
            />
            <Button
              onClick={handleStepBackward}
              disabled={
                ctx.historyIndex <= 0 ||
                ctx.isRunning ||
                ctx.isSteppingToView ||
                ctx.isSteppingToIndex ||
                ctx.isSteppingToBlock
              }
              icon={StepBack}
            />
            <Button
              onClick={handleStepForward}
              disabled={
                !ctx.interpreter ||
                ctx.isRunning ||
                ctx.isComplete ||
                ctx.isSteppingToView ||
                ctx.isSteppingToIndex ||
                ctx.isSteppingToBlock
              }
              icon={StepForward}
            />
            <Button
              onClick={handleStepToBlock}
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
              onClick={toggleAutoPlay}
              disabled={playStepToViewDisabled}
              icon={ctx.isRunning ? Pause : Play}
            />
            <Select
              value={ctx.autoPlaySpeed}
              onChange={(value) => ctx.setAutoPlaySpeed(Number(value))}
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
          {ctx.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-2 rounded">
              <strong>Error:</strong> {ctx.error}
            </div>
          )}
          {/* Main Content */}
          <div className="flex-1 flex border-b overflow-hidden">
            {/* Code Editors Column */}
            <div className="w-1/2 border-r flex flex-col h-full">
              {/* Interpreter View */}
              <CollapsibleSection
                title="Interpreter View"
                isCollapsed={isInterpreterViewCollapsed}
                onToggleCollapse={toggleInterpreterViewCollapse}
                contentClassName="p-0"
              >
                <CodeMirror
                  value={ctx.code}
                  readOnly
                  extensions={[javascript()]}
                  style={CodeMirrorStyle}
                  basicSetup={CodeMirrorSetup}
                  editable={false}
                  ref={ctx.codeMirrorRef}
                />
              </CollapsibleSection>
              {/* User View */}
              <CollapsibleSection
                title="User View"
                isCollapsed={isUserViewCollapsed}
                onToggleCollapse={toggleUserViewCollapse}
                contentClassName="p-0"
              >
                <CodeMirror
                  value={userCode}
                  onChange={(value) => setUserCode(value)}
                  extensions={[javascript(), ...debugExtensions]}
                  style={CodeMirrorStyle}
                  basicSetup={CodeMirrorSetup}
                  ref={userViewCodeMirrorRef}
                />
              </CollapsibleSection>
            </div>
            {/* Debug Info Column */}
            <div className="w-1/2 flex flex-col h-full overflow-hidden">
              <CollapsibleSection
                title="Variables"
                isCollapsed={isVariablesSectionCollapsed}
                onToggleCollapse={toggleVariablesSectionCollapse}
              >
                <VariablesSection currentState={currentState} />
              </CollapsibleSection>
              <CollapsibleSection
                title="Timeline"
                isCollapsed={isTimelineCollapsed}
                onToggleCollapse={toggleTimelineCollapse}
                headerContent={
                  ctx.history.length > 0 && (
                    <div className="text-slate-500 flex flex-row gap-2">
                      {ctx.isComplete && (
                        <span className="text-green-600">Complete</span>
                      )}
                      {ctx.isRunning && (
                        <span className="text-blue-600">Running...</span>
                      )}
                    </div>
                  )
                }
              >
                <Timeline
                  history={ctx.history}
                  historyIndex={ctx.historyIndex}
                  code={ctx.code}
                  getLineFromCharPosition={getLineFromCharPosition}
                  isAtBlock={(index: number) => isAtBlock(ctx.history, index)}
                  onTimelineItemClick={handleTimelineItemClick}
                />
              </CollapsibleSection>
            </div>
          </div>
        </div>
      </>
    );
  }
);

export default DebugModal;
