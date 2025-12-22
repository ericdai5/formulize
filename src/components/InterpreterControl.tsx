import React, { useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import beautify from "js-beautify";

import { refresh } from "../engine/manual/execute";
import { extractManual } from "../engine/manual/extract";
import { isAtBlock } from "../engine/manual/interpreter";
import { executionStore as ctx } from "../store/execution";
import { IEnvironment } from "../types/environment";
import { extractViews } from "../util/acorn";
import { CodeMirrorSetup, CodeMirrorStyle } from "../util/codemirror";
import {
  addArrowMarker,
  addLineMarker,
  clearArrowMarkers,
  clearLineMarkers,
  debugExtensions,
} from "../util/codemirror-extension";
import CollapsibleSection from "./collapsible-section";
import { SimplifiedInterpreterControls } from "./interpreter-controls";
import { useFormulize } from "./useFormulize";

export interface InterpreterControlProps {
  /** The environment configuration containing the manual function */
  environment: IEnvironment;
  /** Optional width for the component */
  width?: number | string;
  /** Optional className for additional styling */
  className?: string;
  /** Whether to show the code step-through section initially collapsed */
  defaultCollapsed?: boolean;
}

/**
 * An interpreter control component for step-through debugging
 * of manual functions. This component can be used independently without
 * requiring React Flow or canvas context.
 */
export const InterpreterControl: React.FC<InterpreterControlProps> = observer(
  ({ environment, width, className = "", defaultCollapsed = false }) => {
    const userViewCodeMirrorRef = useRef<ReactCodeMirrorRef>(null);
    const [userCode, setUserCode] = useState<string>("");
    const [isUserViewCollapsed, setIsUserViewCollapsed] =
      useState(defaultCollapsed);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Get the Formulize context to know when the instance is ready
    // This ensures computationStore is populated before we initialize the interpreter
    let formulizeInstance: unknown = null;
    let formulizeIsLoading = true; // Default to loading until we know otherwise
    let hasFormulizeContext = false;
    try {
      const context = useFormulize();
      hasFormulizeContext = true;
      formulizeInstance = context.instance;
      formulizeIsLoading = context.isLoading;
    } catch {
      // useFormulize throws if not inside FormulizeProvider
      // That's ok - set isLoading to false so we don't block
      formulizeIsLoading = false;
      hasFormulizeContext = false;
    }

    // Initialize user code when environment changes AND Formulize instance is ready
    useEffect(() => {
      if (!environment) {
        setError("No environment provided");
        return;
      }

      // If inside FormulizeProvider, wait for it to finish initializing
      if (hasFormulizeContext && (formulizeIsLoading || !formulizeInstance)) {
        return;
      }

      // Prevent double initialization
      if (isInitialized) {
        return;
      }

      const result = extractManual(environment);
      if (result.isLoading) {
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.code) {
        setError(null);
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

        // Automatically initialize the interpreter so stepping works immediately
        refresh(result.code, environment);
        setIsInitialized(true);
      }
    }, [
      environment,
      formulizeInstance,
      formulizeIsLoading,
      hasFormulizeContext,
      isInitialized,
    ]);

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

        // Both interpreter and user code now have the same view() calls
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
      setIsInitialized(false);
      refresh(ctx.code, environment);
      setIsInitialized(true);
    }, [clearUserViewLine, environment]);

    const containerStyle: React.CSSProperties = {
      width: width || "100%",
    };

    if (error) {
      return (
        <div
          className={`border bg-white border-slate-200 rounded-lg shadow-sm p-4 ${className}`}
          style={containerStyle}
        >
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      );
    }

    return (
      <div
        className={`border bg-white border-slate-200 rounded-lg shadow-sm ${className}`}
        style={containerStyle}
      >
        <SimplifiedInterpreterControls onRefresh={handleRefresh} />
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
    );
  }
);

export default InterpreterControl;
