import { useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import beautify from "js-beautify";
import { GripHorizontal, GripVertical } from "lucide-react";

import CollapsibleSection from "../../components/collapsible-section";
import { SimplifiedInterpreterControls } from "../../components/interpreter-controls";
import { refresh } from "../../engine/manual/execute";
import { extractManual } from "../../engine/manual/extract";
import { isAtBlock } from "../../engine/manual/interpreter";
import { executionStore as ctx } from "../../store/execution";
import { extractViews } from "../../util/acorn";
import { CodeMirrorSetup, CodeMirrorStyle } from "../../util/codemirror";
import {
  addArrowMarker,
  addLineMarker,
  clearArrowMarkers,
  clearLineMarkers,
  debugExtensions,
} from "../../util/codemirror-extension";

// Interpreter Control Node Component
const InterpreterControlNode = observer(({ data }: { data: any }) => {
  const { environment } = data;
  const userViewCodeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  const [userCode, setUserCode] = useState<string>("");
  const [isUserViewCollapsed, setIsUserViewCollapsed] = useState(false);

  // Initialize user code when environment changes
  useEffect(() => {
    const result = extractManual(environment);
    if (result.isLoading || result.error) {
      return;
    }
    if (result.code) {
      ctx.setCode(result.code);
      ctx.setEnvironment(environment);
      const foundViews = extractViews(result.code);
      ctx.setViews(foundViews);

      // Set the user view code to the original manual function
      if (environment?.semantics?.manual) {
        const manualFunction = environment.semantics.manual;
        const functionString = manualFunction.toString();
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

  const clearUserViewLine = useCallback(() => {
    if (userViewCodeMirrorRef.current?.view) {
      const view = userViewCodeMirrorRef.current.view;
      view.dispatch({
        effects: [clearLineMarkers.of(null), clearArrowMarkers.of(null)],
      });
    }
  }, []);

  const convertCharPos = useCallback(
    (interpreterCharPos: number): number => {
      const interpreterLines = ctx.code.split("\n");
      const userLines = userCode.split("\n");

      // Find which line in interpreter code the character position corresponds to
      let currentPos = 0;
      let interpreterLine = 0;

      for (let i = 0; i < interpreterLines.length; i++) {
        const lineLength = interpreterLines[i].length + 1;
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
        userCharPos += userLines[i].length + 1;
      }

      return userCharPos;
    },
    [userCode]
  );

  const getLineFromCharPosition = useCallback(
    (code: string, charPosition: number): number => {
      const lines = code.substring(0, charPosition).split("\n");
      return lines.length - 1;
    },
    []
  );

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

  const currentState = ctx.history[ctx.historyIndex];

  useEffect(() => {
    if (!ctx.history || ctx.history.length === 0 || !userCode) {
      clearUserViewLine();
      return;
    }

    if (currentState?.highlight) {
      const userCharPos = convertCharPos(currentState.highlight.start);
      const userLine = getLineFromCharPosition(userCode, userCharPos);
      highlightUserViewLine(userLine);
      // Also handle block statement highlighting
      handleUserViewHighlighting(ctx.historyIndex);
    } else {
      clearUserViewLine();
    }
  }, [
    currentState,
    userCode,
    convertCharPos,
    getLineFromCharPosition,
    highlightUserViewLine,
    clearUserViewLine,
    handleUserViewHighlighting,
  ]);

  const handleRefresh = useCallback(() => {
    clearUserViewLine();
    refresh(ctx.code, environment);
  }, [clearUserViewLine, environment]);

  return (
    <div className="interpreter-control-node border bg-white border-slate-200 rounded-lg shadow-sm w-full relative group">
      {/* Drag handles */}
      <div className="interpreter-drag-handle absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-1 py-0.5 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripHorizontal className="w-4 h-4 text-slate-400" />
      </div>
      <div className="interpreter-drag-handle absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-1 py-0.5 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripHorizontal className="w-4 h-4 text-slate-400" />
      </div>
      <div className="interpreter-drag-handle absolute top-1/2 -left-3 transform -translate-y-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-0.5 py-1 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>
      <div className="interpreter-drag-handle absolute top-1/2 -right-3 transform -translate-y-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-0.5 py-1 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      <div className="nodrag">
        <SimplifiedInterpreterControls onRefresh={handleRefresh} />
        {/* User View */}
        <CollapsibleSection
          title="Code Step-through"
          isCollapsed={isUserViewCollapsed}
          onToggleCollapse={() => setIsUserViewCollapsed(!isUserViewCollapsed)}
          contentClassName="p-0"
        >
          <div style={{ textAlign: "left" }}>
            <CodeMirror
              value={userCode}
              onChange={(value) => setUserCode(value)}
              extensions={[javascript(), ...debugExtensions]}
              style={CodeMirrorStyle}
              basicSetup={CodeMirrorSetup}
              ref={userViewCodeMirrorRef}
            />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
});

export default InterpreterControlNode;
