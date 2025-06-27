import React, { useEffect, useRef, useState } from "react";

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

import { extractManual } from "../api/computation-engines/manual/extract";
import {
  JSInterpreter,
  StackFrame,
  collectVariablesFromStack,
  initializeInterpreter,
  isAtView,
} from "../api/computation-engines/manual/interpreter";
import { IEnvironment } from "../types/environment";
import { extractVariableNames, extractViews } from "../util/acorn";
import { highlightCode } from "../util/codemirror";
import Button from "./button";
import Select from "./select";

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
  viewParams?: {
    pairs?: Array<[string, string]>;
  };
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
  const [views, setViews] = useState<
    Array<{ start: number; end: number; line?: number; column?: number }>
  >([]);
  const [isSteppingToView, setIsSteppingToView] = useState(false);
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
      const foundViews = extractViews(result.code);
      console.log("Views extracted:", foundViews);
      setViews(foundViews);
      console.log("Views state set to:", foundViews);
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

    // Capture view parameters if available
    const viewParams = interpreter._currentViewParams;

    return {
      step: stepNumber,
      highlight: { start: node?.start || 0, end: node?.end || 0 },
      variables,
      stackTrace: stack.map((s, i: number) => {
        const frame = s as StackFrame;
        return `Frame ${i}: ${frame.node?.type || "Unknown"}${frame.func?.node?.id?.name ? ` (${frame.func.node.id.name})` : ""}`;
      }),
      timestamp: Date.now(),
      viewParams,
    };
  };

  const refresh = () => {
    setInterpreter(null);
    setHistory([]);
    setIsComplete(false);
    setError(null);
    setIsRunning(false);
    setIsSteppingToView(false);

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

    // Then initialize if we have code
    if (!code.trim()) {
      setError("No code to debug");
      return;
    }

    const newInterpreter = initializeInterpreter(code, environment, setError);
    if (!newInterpreter) return;

    setInterpreter(newInterpreter);

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
      // Clear any previous view parameters at the start of each step
      if (interpreter._currentViewParams) {
        interpreter._currentViewParams = undefined;
      }

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
        setIsSteppingToView(false);
        if (autoPlayIntervalRef.current) {
          clearInterval(autoPlayIntervalRef.current);
          autoPlayIntervalRef.current = null;
        }
      }

      // Check if we've hit a view() breakpoint while stepping to breakpoint
      if (isSteppingToView && isAtView(interpreter)) {
        setIsSteppingToView(false);
        console.log("Hit view() breakpoint at step:", history.length);
      }
    } catch (err) {
      setError(`Execution error: ${err}`);
      setIsRunning(false);
      setIsSteppingToView(false);
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
    }
  };

  // Step to the next breakpoint
  const stepToView = () => {
    if (!interpreter || isComplete) {
      return;
    }

    setIsSteppingToView(true);
    console.log("Stepping to next view()");

    try {
      // Limit steps to prevent infinite loops
      let stepsCount = 0;
      const maxSteps = 100000;

      // If we're currently at a view() breakpoint, step past it first
      if (isAtView(interpreter)) {
        console.log("At view(), stepping past it.");

        // Step until we're no longer at the same view() breakpoint
        let stillAtSameView = true;
        while (stillAtSameView && stepsCount < maxSteps) {
          const canContinue = interpreter.step();
          stepsCount++;

          const newState = getCurrentState(interpreter, history.length);
          setHistory((prev) => [...prev, newState]);
          highlightCode(
            codeMirrorRef,
            newState.highlight.start,
            newState.highlight.end
          );

          if (!canContinue) {
            setIsComplete(true);
            setIsSteppingToView(false);
            console.log(
              "Execution completed while stepping past view() breakpoint"
            );
            return;
          }

          // Check if we're still at the same view() breakpoint
          stillAtSameView = isAtView(interpreter);
          if (!stillAtSameView) {
            console.log(
              `Stepped past view() breakpoint after ${stepsCount} steps`
            );
          }
        }

        if (stepsCount >= maxSteps) {
          setError(
            "Maximum steps reached while trying to step past view() breakpoint"
          );
          setIsSteppingToView(false);
          return;
        }
      }

      // Now step until we hit the next view() breakpoint
      console.log("Looking for next view() breakpoint...");
      let foundNextView = false;

      while (!foundNextView && stepsCount < maxSteps) {
        const canContinue = interpreter.step();
        stepsCount++;

        const state = getCurrentState(interpreter, history.length);
        setHistory((prev) => [...prev, state]);
        highlightCode(
          codeMirrorRef,
          state.highlight.start,
          state.highlight.end
        );

        if (!canContinue) {
          setIsComplete(true);
          setIsSteppingToView(false);
          console.log(
            `Execution completed without finding another View after ${stepsCount} steps`
          );
          return;
        }

        if (isAtView(interpreter)) {
          foundNextView = true;
          setIsSteppingToView(false);
          console.log(`Found next View after ${stepsCount} steps`);
          return;
        }
      }

      if (stepsCount >= maxSteps) {
        setError("Maximum steps reached while looking for next View");
        setIsSteppingToView(false);
        return;
      }
    } catch (err) {
      setError(`Execution error: ${err}`);
      setIsSteppingToView(false);
      console.error("Error during step to View:", err);
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

  // Debug button state - now checking for view() functions instead of comment breakpoints
  const buttonDisabled = !interpreter || isComplete || isSteppingToView;
  console.log("Step to @View button disabled:", buttonDisabled, {
    noInterpreter: !interpreter,
    isComplete,
    isSteppingToView,
  });

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
          <Button
            onClick={refresh}
            disabled={isRunning || isSteppingToView}
            icon={RotateCcw}
          />
          <Button
            onClick={stepBackward}
            disabled={history.length <= 1 || isRunning || isSteppingToView}
            icon={StepBack}
          />
          <Button
            onClick={stepForward}
            disabled={
              !interpreter || isRunning || isComplete || isSteppingToView
            }
            icon={StepForward}
          />
          <Button onClick={stepToView} disabled={buttonDisabled} icon={Eye}>
            {views.length}
          </Button>
          <Button
            onClick={toggleAutoPlay}
            disabled={!interpreter || isComplete || isSteppingToView}
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
          <Button onClick={onClose} icon={X} />
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

          {/* Debug Info */}
          <div className="w-1/2 flex flex-col">
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
