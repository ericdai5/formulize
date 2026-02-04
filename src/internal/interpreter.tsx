import React, { useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";

import { refresh, stepForward, toIndex } from "../engine/execute";
import { isAtBlock } from "../engine/interpreter";
import { CodeMirrorSetup, CodeMirrorStyle } from "../util/codemirror";
import {
  addArrowMarker,
  addLineMarker,
  clearArrowMarkers,
  clearLineMarkers,
  debugExtensions,
} from "../util/codemirror/extension";
import CollapsibleSection from "../ui/collapsible-section";
import InterpreterControls from "./interpreter-controls";
import Timeline from "./timeline";
import { useFormulize } from "../core/hooks";
import { VariablesSection } from "./variable-section";

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Debug modal for step-through debugging of manual functions.
 * Must be used inside a FormulizeProvider which handles code extraction.
 */
const DebugModal: React.FC<DebugModalProps> = observer(
  ({ isOpen, onClose }) => {
    const context = useFormulize();
    const computationStore = context?.computationStore;
    const executionStore = context?.executionStore;

    // Guard: stores must be available
    if (!computationStore || !executionStore) {
      return null;
    }
    const ctx = executionStore;
    const userViewCodeMirrorRef = useRef<ReactCodeMirrorRef>(null);

    // Track open sections in order (max 2 can be open at once)
    type SectionId = "interpreter" | "userView" | "variables" | "timeline";
    const [openSections, setOpenSections] = useState<SectionId[]>(["interpreter", "variables"]);

    const toggleSection = (sectionId: SectionId) => {
      setOpenSections((prev) => {
        const isCurrentlyOpen = prev.includes(sectionId);
        if (isCurrentlyOpen) {
          // Close the section
          return prev.filter((id) => id !== sectionId);
        } else {
          // Open the section, but enforce max 2 open
          const newOpen = [...prev, sectionId];
          if (newOpen.length > 2) {
            // Remove the oldest (first) one
            return newOpen.slice(1);
          }
          return newOpen;
        }
      });
    };

    const isSectionCollapsed = (sectionId: SectionId) => !openSections.includes(sectionId);

    // Read userCode from the store (set by FormulizeProvider during initialization)
    const userCode = ctx.userCode;

    // Functions to control line markers and arrow gutter markers
    const setCurrentLine = useCallback(
      (line: number) => {
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
      },
      [ctx]
    );

    const clearCurrentLine = useCallback(() => {
      if (ctx.codeMirrorRef.current?.view) {
        const view = ctx.codeMirrorRef.current.view;
        view.dispatch({
          effects: [clearLineMarkers.of(null), clearArrowMarkers.of(null)],
        });
      }
    }, [ctx]);

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
      [userCode, ctx.code]
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
      [
        convertCharPos,
        getLineFromCharPosition,
        userCode,
        highlightUserViewLine,
        ctx.history,
      ]
    );

    // Handle clicking on timeline items to travel to that point in history
    const handleTimelineItemClick = useCallback(
      (index: number) => {
        toIndex(index, ctx, computationStore);
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
      ctx.code,
      ctx.historyIndex,
    ]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (ctx.autoPlayIntervalRef.current) {
          clearInterval(ctx.autoPlayIntervalRef.current);
        }
      };
    }, [ctx]);

    return (
      <div
        className={`h-full bg-white border-l border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? "w-96" : "w-0"
        } overflow-hidden`}
      >
        {/* Controls Header */}
        <div className="min-w-96">
          <InterpreterControls
            onClose={onClose}
            onRefresh={handleRefresh}
            onToggleAutoPlay={toggleAutoPlay}
          />
        </div>
        {/* Error Display */}
        {ctx.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-2 rounded text-sm min-w-96">
            <strong>Error:</strong> {ctx.error}
          </div>
        )}
        {/* Main Content - Stacked Sections */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-96">
          {/* Interpreter View */}
          <CollapsibleSection
            title="Interpreter View"
            isCollapsed={isSectionCollapsed("interpreter")}
            onToggleCollapse={() => toggleSection("interpreter")}
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
            isCollapsed={isSectionCollapsed("userView")}
            onToggleCollapse={() => toggleSection("userView")}
            contentClassName="p-0"
          >
            <CodeMirror
              value={userCode}
              onChange={(value) => ctx.setUserCode(value)}
              extensions={[javascript(), ...debugExtensions]}
              style={CodeMirrorStyle}
              basicSetup={CodeMirrorSetup}
              ref={userViewCodeMirrorRef}
            />
          </CollapsibleSection>
          {/* Variables */}
          <CollapsibleSection
            title="Variables"
            isCollapsed={isSectionCollapsed("variables")}
            onToggleCollapse={() => toggleSection("variables")}
          >
            <VariablesSection currentState={currentState} />
          </CollapsibleSection>
          {/* Timeline */}
          <CollapsibleSection
            title="Timeline"
            isCollapsed={isSectionCollapsed("timeline")}
            onToggleCollapse={() => toggleSection("timeline")}
            headerContent={
              ctx.history.length > 0 && (
                <div className="text-slate-500 flex flex-row gap-2 text-sm">
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
    );
  }
);

export default DebugModal;
