import React, { useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import beautify from "js-beautify";

import { refresh, stepForward, stepToIndex } from "../engine/manual/execute";
import { extractManual } from "../engine/manual/extract";
import { isAtBlock } from "../engine/manual/interpreter";
import { IEnvironment } from "../types/environment";
import { CodeMirrorSetup, CodeMirrorStyle } from "../util/codemirror";
import {
  addArrowMarker,
  addLineMarker,
  clearArrowMarkers,
  clearLineMarkers,
  debugExtensions,
} from "../util/codemirror-extension";
import CollapsibleSection from "./collapsible-section";
import InterpreterControls from "./interpreter-controls";
import Timeline from "./timeline";
import { useFormulize } from "./useFormulize";
import { VariablesSection } from "./variable-section";

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment | null;
}

const DebugModal: React.FC<DebugModalProps> = observer(
  ({ isOpen, onClose, environment }) => {
    const context = useFormulize();
    const computationStore = context?.computationStore;
    const executionStore = context?.executionStore;

    // Guard: stores must be available
    if (!computationStore || !executionStore) {
      return null;
    }
    const ctx = executionStore;
    const userViewCodeMirrorRef = useRef<ReactCodeMirrorRef>(null);
    const [userCode, setUserCode] = useState<string>("");
    const [isInterpreterCollapsed, setIsInterpreterCollapsed] = useState(false);
    const [isUserViewCollapsed, setIsUserViewCollapsed] = useState(false);
    const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
    const [isVariablesCollapsed, setIsVariablesCollapsed] = useState(false);
    const toggleInterpreter = () =>
      setIsInterpreterCollapsed(!isInterpreterCollapsed);
    const toggleUserView = () => setIsUserViewCollapsed(!isUserViewCollapsed);
    const toggleTimeline = () => setIsTimelineCollapsed(!isTimelineCollapsed);
    const toggleVariables = () =>
      setIsVariablesCollapsed(!isVariablesCollapsed);

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
        ctx.setError(null);
        // Set the user view code to the original manual function
        if (environment?.semantics?.manual) {
          const manualFunction = environment.semantics.manual;
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
      refresh(ctx.code, ctx.environment, ctx, computationStore);
    }, [clearUserViewLine, ctx, computationStore]);

    // Toggle auto-play
    const toggleAutoPlay = () => {
      if (ctx.autoPlayIntervalRef.current) {
        clearInterval(ctx.autoPlayIntervalRef.current);
        ctx.autoPlayIntervalRef.current = null;
        ctx.setIsRunning(false);
      } else {
        ctx.setIsRunning(true);
        ctx.autoPlayIntervalRef.current = setInterval(() => {
          // Check if we're at the end of history before stepping
          if (ctx.historyIndex >= ctx.history.length - 1) {
            // Stop autoplay if we've reached the end
            clearInterval(ctx.autoPlayIntervalRef.current!);
            ctx.autoPlayIntervalRef.current = null;
            ctx.setIsRunning(false);
            return;
          }
          stepForward(ctx, computationStore);
        }, ctx.autoPlaySpeed);
      }
    };

    /**
     * Helper function to convert character position from interpreter code to user code.
     * The interpreter code has a wrapper function, but both now use direct view() calls.
     */
    const convertCharPos = useCallback(
      (interpreterCharPos: number): number => {
        const interpreterLines = ctx.code.split("\n");
        const userLines = userCode.split("\n");

        // Find which line in interpreter code the character position corresponds to
        let currentPos = 0;
        let interpreterLine = 0;

        for (let i = 0; i < interpreterLines.length; i++) {
          const lineLength = interpreterLines[i].length + 1; // +1 for newline
          if (currentPos + lineLength > interpreterCharPos) {
            interpreterLine = i;
            break;
          }
          currentPos += lineLength;
        }

        // The interpreter code has a wrapper: "function executeManualFunction() {"
        // which adds 1 line offset compared to user code "function(vars) {"
        // Both now have the same view() calls, so no view-related adjustment needed
        const userLine = Math.max(
          0,
          Math.min(interpreterLine, userLines.length - 1)
        );

        // Convert user line back to character position
        let userCharPos = 0;
        for (let i = 0; i < userLine; i++) {
          userCharPos += userLines[i].length + 1; // +1 for newline
        }

        return userCharPos;
      },
      [userCode]
    );

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

    // Helper function to handle user view highlighting for block statements
    const handleUserViewHighlighting = useCallback(
      (index: number) => {
        if (isAtBlock(ctx.history, index) && index > 0) {
          const previousState = ctx.history[index - 1];
          if (previousState?.highlight) {
            const userCharPos = convertCharPos(previousState.highlight.start);
            const previousLine = getLineFromCharPosition(userCode, userCharPos);
            highlightUserViewLine(previousLine);
          }
        }
      },
      [convertCharPos, getLineFromCharPosition, userCode, highlightUserViewLine]
    );

    // Handle clicking on timeline items to travel to that point in history
    const handleTimelineItemClick = useCallback(
      (index: number) => {
        stepToIndex(index, ctx, computationStore);
      },
      [ctx, computationStore]
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
        handleUserViewHighlighting(ctx.historyIndex);
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
      handleUserViewHighlighting,
    ]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (ctx.autoPlayIntervalRef.current) {
          clearInterval(ctx.autoPlayIntervalRef.current);
        }
      };
    }, []);

    if (!isOpen) return null;

    return (
      <>
        <div
          className={`fixed top-0 right-0 h-full w-1/2 max-w-3xl bg-white z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Controls Header */}
          <InterpreterControls
            onClose={onClose}
            onRefresh={handleRefresh}
            onStepToIndex={() => {}}
            onToggleAutoPlay={toggleAutoPlay}
          />
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
                isCollapsed={isInterpreterCollapsed}
                onToggleCollapse={toggleInterpreter}
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
                onToggleCollapse={toggleUserView}
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
                isCollapsed={isVariablesCollapsed}
                onToggleCollapse={toggleVariables}
              >
                <VariablesSection currentState={currentState} />
              </CollapsibleSection>
              <CollapsibleSection
                title="Timeline"
                isCollapsed={isTimelineCollapsed}
                onToggleCollapse={toggleTimeline}
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
                  isAtView={(index: number) => ctx.isView(index)}
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
