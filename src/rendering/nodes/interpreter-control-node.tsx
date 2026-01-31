import { useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";

import { SimplifiedInterpreterControls } from "../../components/interpreter-controls";
import { useFormulize } from "../../components/useFormulize";
import { isAtBlock } from "../../engine/manual/interpreter";
import { CodeMirrorSetup, CodeMirrorStyle } from "../../util/codemirror";
import {
  addArrowMarker,
  addLineMarker,
  clearArrowMarkers,
  clearLineMarkers,
  debugExtensions,
} from "../../util/codemirror-extension";

// Interpreter Control Node Component
// Must be used inside a FormulizeProvider which handles code extraction
const InterpreterControlNode = observer(() => {
  const context = useFormulize();
  const executionStore = context?.executionStore;
  const isLoading = context?.isLoading ?? true;
  const userViewCodeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  const [isUserViewCollapsed, setIsUserViewCollapsed] = useState(false);

  // Read userCode from the store (set by FormulizeProvider during initialization)
  const userCode = executionStore?.userCode ?? "";

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
      if (!executionStore || !userCode) {
        return 0;
      }
      const interpreterLines = executionStore.code.split("\n");
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
    [userCode, executionStore]
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
      if (!executionStore || !userCode) {
        return;
      }
      if (isAtBlock(executionStore.history, index) && index > 0) {
        const previousState = executionStore.history[index - 1];
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
      executionStore,
    ]
  );

  const currentState =
    executionStore?.history[executionStore.historyIndex] ?? null;

  useEffect(() => {
    if (!executionStore) {
      return;
    }
    if (
      !executionStore.history ||
      executionStore.history.length === 0 ||
      !userCode
    ) {
      clearUserViewLine();
      return;
    }

    if (currentState?.highlight) {
      const userCharPos = convertCharPos(currentState.highlight.start);
      const userLine = getLineFromCharPosition(userCode, userCharPos);
      highlightUserViewLine(userLine);
      // Also handle block statement highlighting
      handleUserViewHighlighting(executionStore.historyIndex);
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
    executionStore,
  ]);

  // Guard: executionStore must be provided
  if (!executionStore) {
    return null;
  }

  // Show loading state while FormulizeProvider is initializing
  if (isLoading && !userCode) {
    return (
      <div className="interpreter-control-node border bg-white border-slate-200 rounded-2xl shadow-sm w-full p-4">
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
  const progress = totalSteps > 0 ? (currentStepNumber / totalSteps) * 100 : 0;

  return (
    <div className="interpreter-control-node border bg-white border-slate-200 rounded-2xl shadow-sm w-full relative group overflow-hidden">
      <SimplifiedInterpreterControls
        onToggleCode={() => setIsUserViewCollapsed(!isUserViewCollapsed)}
        showCode={!isUserViewCollapsed}
      />

      {/* Progress Bar and Step Counter */}
      <div className="h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* User View */}
      {!isUserViewCollapsed && (
        <div
          style={{ textAlign: "left", cursor: "default" }}
          className="nodrag"
        >
          <CodeMirror
            value={userCode}
            onChange={(value) => executionStore.setUserCode(value)}
            extensions={[javascript(), ...debugExtensions]}
            style={CodeMirrorStyle}
            basicSetup={CodeMirrorSetup}
            ref={userViewCodeMirrorRef}
          />
        </div>
      )}
    </div>
  );
});

export default InterpreterControlNode;
