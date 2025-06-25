import React, { useEffect, useRef, useState } from "react";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";

import { extractManual } from "../api/computation-engines/manual/extract";
import {
  JSInterpreter,
  StackFrame,
  collectVariablesFromStack,
  initializeInterpreter,
} from "../api/computation-engines/manual/interpreter";
import { IEnvironment } from "../types/environment";
import { extractVariableNames } from "../util/acorn";
import { highlightCode } from "../util/codemirror";
import Button from "./Button";
import Modal from "./Modal";

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment | null;
}

interface DebugState {
  step: number;
  highlight: { start: number; end: number };
  variables: Record<string, unknown>;
  stackTrace: string[];
  timestamp: number;
}

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
  const autoPlayIntervalRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const codeMirrorRef = useRef<any>(null);

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
      // Clear previous errors
      setError(null);
    }
  }, [environment]);

  const getCurrentState = (
    interpreter: JSInterpreter,
    stepNumber: number
  ): DebugState => {
    const stack = interpreter.getStateStack();
    const node = stack.length
      ? (stack[stack.length - 1] as StackFrame).node
      : null;
    const variables: Record<string, unknown> = {};

    try {
      // Extract variable names from code
      const varNames = extractVariableNames(code);
      console.log("Variables names found:", varNames);

      // Use the refactored variable extraction
      const extractedVariables = collectVariablesFromStack(
        interpreter,
        stack,
        varNames
      );
      Object.assign(variables, extractedVariables);

      // Capture the interpreter's current value (result of last statement)
      if (interpreter.value !== undefined) {
        try {
          variables["Interpreter Value"] = interpreter.pseudoToNative
            ? interpreter.pseudoToNative(interpreter.value)
            : interpreter.value;
        } catch {
          variables["Interpreter Value"] = interpreter.value;
        }
      }

      // Add debugging info about execution state
      variables["Current Node Type"] = node?.type || "Unknown";
      variables["Stack Depth"] = stack?.length || 0;
      variables["Declared Variables"] = varNames;

      // Add more detailed node information
      if (node) {
        variables["Node Info"] = {
          type: node.type,
          start: node.start,
          end: node.end,
          ...(node.type === "Identifier" && { name: node.name }),
          ...(node.type === "VariableDeclaration" && {
            declarations: node.declarations
              ?.map((d: { id?: { name: string } }) => d.id?.name)
              .filter(Boolean),
          }),
          ...(node.type === "AssignmentExpression" && {
            operator: node.operator,
            leftName: node.left?.name,
          }),
          ...(node.type === "BinaryExpression" && {
            operator: node.operator,
            left: node.left?.type,
            right: node.right?.type,
          }),
        };
      }

      if (stack && stack.length > 0) {
        const currentState = stack[stack.length - 1] as StackFrame;
        if (currentState.scope) {
          variables["Current Scope Type"] = currentState.scope.constructor.name;
        }
        if (currentState.func && currentState.func.node) {
          variables["Current Function"] =
            currentState.func.node.id?.name || "Anonymous";
        }
      }

      console.log("All variables:", variables);
    } catch (err) {
      console.warn("Error extracting variables:", err);
      variables["[Error]"] = `Could not extract variables: ${err}`;
    }

    return {
      step: stepNumber,
      highlight: { start: node?.start || 0, end: node?.end || 0 },
      variables,
      stackTrace: stack.map((s, i: number) => {
        const frame = s as StackFrame;
        return `Frame ${i}: ${frame.node?.type || "Unknown"}${frame.func?.node?.id?.name ? ` (${frame.func.node.id.name})` : ""}`;
      }),
      timestamp: Date.now(),
    };
  };

  // Start debugging
  const startDebugging = () => {
    if (!code.trim()) {
      setError("No code to debug");
      return;
    }

    const newInterpreter = initializeInterpreter(code, environment, setError);
    if (!newInterpreter) return;

    setInterpreter(newInterpreter);
    setHistory([]);
    setIsComplete(false);
    setError(null);
    setIsRunning(false);

    // Add initial state
    const initialState = getCurrentState(newInterpreter, 0);
    setHistory([initialState]);
    highlightCode(
      codeMirrorRef,
      initialState.highlight.start,
      initialState.highlight.end
    );
  };

  // Step forward
  const stepForward = () => {
    if (!interpreter || isComplete) return;

    try {
      const canContinue = interpreter.step();
      const newState = getCurrentState(interpreter, history.length);

      setHistory((prev) => [...prev, newState]);
      highlightCode(
        codeMirrorRef,
        newState.highlight.start,
        newState.highlight.end
      );

      if (!canContinue) {
        setIsComplete(true);
        setIsRunning(false);
        if (autoPlayIntervalRef.current) {
          clearInterval(autoPlayIntervalRef.current);
          autoPlayIntervalRef.current = null;
        }
      }
    } catch (err) {
      setError(`Execution error: ${err}`);
      setIsRunning(false);
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
    }
  };

  // Step backward - simplified to just highlight previous step
  const stepBackward = () => {
    if (history.length <= 1) return;
    const prevState = history[history.length - 2];
    highlightCode(
      codeMirrorRef,
      prevState.highlight.start,
      prevState.highlight.end
    );
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
        stepForward();
      }, autoPlaySpeed);
    }
  };

  // Reset debug session
  const resetDebug = () => {
    setInterpreter(null);
    setHistory([]);
    setIsComplete(false);
    setError(null);
    setIsRunning(false);

    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }

    if (codeMirrorRef.current) {
      const view = codeMirrorRef.current.view;
      if (view) {
        view.dispatch({
          selection: { anchor: 0, head: 0 },
          scrollIntoView: true,
        });
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, []);

  const currentState = history[history.length - 1];
  const hasSteps = history.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Function Step-Through"
      maxWidth="max-w-6xl"
    >
      <div className="h-[85vh] flex flex-col">
        {/* Controls Header */}
        <div className="flex justify-start items-center p-2 border-b gap-2">
          <Button onClick={startDebugging} disabled={isRunning} icon="🔄">
            Initialize Debug
          </Button>
          <Button
            onClick={stepForward}
            disabled={!interpreter || isRunning || isComplete}
            icon="➡️"
          >
            Step Forward
          </Button>
          <Button
            onClick={stepBackward}
            disabled={history.length <= 1 || isRunning}
            icon="⬅️"
          >
            Step Back
          </Button>
          <Button
            onClick={toggleAutoPlay}
            disabled={!interpreter || isComplete}
            icon={isRunning ? "⏸️" : "▶️"}
          >
            {isRunning ? "Pause" : "Auto Play"}
          </Button>
          <Button onClick={resetDebug} icon="🛑">
            Reset
          </Button>
          <select
            value={autoPlaySpeed}
            onChange={(e) => setAutoPlaySpeed(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 border-slate-200"
          >
            <option value={100}>100ms</option>
            <option value={300}>300ms</option>
            <option value={500}>500ms</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
          </select>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 border-b">
          <div className="flex justify-between items-center">
            <span>
              {hasSteps && (
                <>
                  <strong>Steps: {history.length}</strong>
                  {isComplete && (
                    <span className="text-green-600 ml-2">✅ Complete</span>
                  )}
                  {isRunning && (
                    <span className="text-blue-600 ml-2">🔄 Running...</span>
                  )}
                </>
              )}
            </span>
            {currentState?.variables && (
              <span>
                Variables: {Object.keys(currentState.variables).length}
              </span>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-2 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Code with Highlighting */}
          <div className="w-1/2 border-r flex flex-col">
            <CodeMirror
              value={code}
              readOnly
              extensions={[javascript()]}
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

          {/* Right Panel - Debug Info */}
          <div className="w-1/2 flex flex-col">
            {/* Current Variables */}
            {currentState && (
              <div className="border-b max-h-1/2">
                <div className="px-4 py-2 font-semibold border-b border-slate-200">
                  Visible Variables
                </div>
                <div className="p-4 overflow-y-auto max-h-64">
                  {Object.keys(currentState.variables).length > 0 ? (
                    <div className="space-y-2">
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
                            className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-blue-800">
                                {key}
                              </span>
                              <span className="text-gray-500">=</span>
                              <span className="font-mono text-blue-700 break-all min-w-0 flex-1">
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
                            className="bg-gray-50 border border-gray-200 rounded-lg p-2"
                          >
                            <div className="text-xs text-gray-600 break-words">
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

            {/* Step History */}
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 border-b border-slate-200 font-semibold">
                Timeline
              </div>
              <div className="flex-1 overflow-y-auto p-4 max-h-96">
                {/* Debug info */}
                <div className="mb-2 p-2 bg-yellow-50 border rounded-xl border-yellow-200">
                  Total Steps: {history.length} | Auto-playing:{" "}
                  {isRunning ? "Yes" : "No"}
                </div>
                {history.map((state, index) => {
                  return (
                    <div
                      key={index}
                      className={`mb-2 p-3 border rounded-xl transition-colors bg-slate-50 border-slate-200`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-sm">
                          Step {index}
                          {index === history.length - 1 && (
                            <span className="ml-2 text-blue-600">
                              ← Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(state.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        Code position: {state.highlight.start}-
                        {state.highlight.end}
                      </div>
                      {state.stackTrace.length > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          Stack: {state.stackTrace[state.stackTrace.length - 1]}
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
    </Modal>
  );
};

export default DebugModal;
