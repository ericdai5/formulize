import React, { useEffect, useRef, useState } from "react";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";

import { IEnvironment } from "../types/environment";
import Button from "./Button";
import Modal from "./Modal";

// Extend Window interface to include acorn parser
declare global {
  interface Window {
    acorn?: {
      parse: (code: string, options?: any) => any;
    };
  }
}

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  environment: IEnvironment | null;
}

interface DebugState {
  step: number;
  codeHighlight: { start: number; end: number };
  variables: Record<string, any>;
  stackTrace: string[];
  timestamp: number;
}

// Helper function to extract all declared variable names from JavaScript code
// This function parses JavaScript code using the acorn parser and walks through the AST
// to find all variable declarations (var, let, const), function declarations, and function parameters
// Example: extractVariableNames("var x = 1; let y = 2; function foo(a, b) {}")
// Returns: ["x", "y", "foo", "a", "b"]
const extractVariableNames = (code: string): string[] => {
  try {
    // Use acorn parser from the JS-Interpreter to parse the code
    if (!window.acorn || !window.acorn.parse) {
      console.warn("Acorn parser not available");
      return [];
    }

    const ast = window.acorn.parse(code, {
      allowReturnOutsideFunction: true,
      strictSemicolons: false,
      allowTrailingCommas: true,
    });

    const variableNames: string[] = [];

    // Walk through the AST to find variable declarations
    const walkAst = (node: any) => {
      if (!node || typeof node !== "object") return;

      // Handle VariableDeclaration nodes (var, let, const)
      if (node.type === "VariableDeclaration") {
        if (node.declarations && Array.isArray(node.declarations)) {
          for (const declaration of node.declarations) {
            if (declaration.id && declaration.id.name) {
              variableNames.push(declaration.id.name);
            }
            // Handle destructuring assignments like { x, y } = obj
            else if (
              declaration.id &&
              declaration.id.type === "ObjectPattern"
            ) {
              if (declaration.id.properties) {
                for (const prop of declaration.id.properties) {
                  if (prop.value && prop.value.name) {
                    variableNames.push(prop.value.name);
                  }
                }
              }
            }
            // Handle array destructuring like [a, b] = arr
            else if (declaration.id && declaration.id.type === "ArrayPattern") {
              if (declaration.id.elements) {
                for (const element of declaration.id.elements) {
                  if (element && element.name) {
                    variableNames.push(element.name);
                  }
                }
              }
            }
          }
        }
      }

      // Handle FunctionDeclaration nodes to get function names
      if (node.type === "FunctionDeclaration" && node.id && node.id.name) {
        variableNames.push(node.id.name);
      }

      // Handle function parameters
      if (
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression"
      ) {
        if (node.params && Array.isArray(node.params)) {
          for (const param of node.params) {
            if (param.name) {
              variableNames.push(param.name);
            }
          }
        }
      }

      // Recursively walk through child nodes
      for (const key in node) {
        if (key === "parent") continue; // Avoid circular references
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            walkAst(item);
          }
        } else if (child && typeof child === "object") {
          walkAst(child);
        }
      }
    };

    walkAst(ast);

    // Remove duplicates and return
    return [...new Set(variableNames)];
  } catch (error) {
    console.error("Error parsing code to extract variable names:", error);
    return [];
  }
};

const DebugModal: React.FC<DebugModalProps> = ({
  isOpen,
  onClose,
  environment,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(500);
  const [interpreter, setInterpreter] = useState<any>(null);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [debugHistory, setDebugHistory] = useState<DebugState[]>([]);

  const autoPlayIntervalRef = useRef<number | null>(null);
  const codeMirrorRef = useRef<any>(null);

  // Initialize interpreter and code when environment changes
  useEffect(() => {
    if (environment?.formulas?.[0]?.manual) {
      const func = environment.formulas[0].manual;
      const funcStr = func.toString();

      // Extract function body without any transformations
      let functionBody = "";
      try {
        const bodyStart = funcStr.indexOf("{");
        const bodyEnd = funcStr.lastIndexOf("}");
        if (bodyStart !== -1 && bodyEnd !== -1) {
          functionBody = funcStr.substring(bodyStart + 1, bodyEnd).trim();
        }

        // Wrap the function body in a proper function declaration
        const wrappedCode = `function executeManualFunction() {
${functionBody}
}

// Parse variables from JSON (needed for the original function body)
var variables = JSON.parse(getVariablesJSON());

// Debug: Check available variables
allVariables();

var result = executeManualFunction();

// Debug: Check after execution
allVariables();`;

        setCurrentCode(wrappedCode);
      } catch (err) {
        setError(`Failed to extract function body: ${err}`);
        return;
      }
    }
  }, [environment]);

  // Initialize JS-Interpreter with variables object
  const initializeInterpreter = () => {
    if (!window.Interpreter) {
      setError("JS-Interpreter not loaded. Please refresh the page.");
      return null;
    }
    if (!currentCode.trim()) {
      setError("No code available to execute");
      return null;
    }

    try {
      // Create initialization function to set up variables properly
      const initFunc = (interpreter: any, globalObject: any) => {
        const envVariables = environment?.variables || {};

        // Set up each environment variable as a global property for tracking
        for (const [key, variable] of Object.entries(envVariables)) {
          try {
            // Convert the variable to a pseudo object that the interpreter can track
            const pseudoVariable = interpreter.nativeToPseudo(variable);
            interpreter.setProperty(globalObject, key, pseudoVariable);
            console.log(`Set up variable ${key}:`, variable);
          } catch (err) {
            console.error(`Error setting up variable ${key}:`, err);
            // Fallback to setting as primitive value
            interpreter.setProperty(globalObject, key, variable);
          }
        }

        // Also provide the getVariablesJSON function that the original function expects
        const getVariablesJSONWrapper = function () {
          return JSON.stringify(envVariables);
        };
        interpreter.setProperty(
          globalObject,
          "getVariablesJSON",
          interpreter.createNativeFunction(getVariablesJSONWrapper)
        );

        // Add a console.log function for debugging
        const consoleLogWrapper = function (...args: any[]) {
          console.log("Interpreter log:", ...args);
          return undefined;
        };
        const consoleObj = interpreter.nativeToPseudo({});
        interpreter.setProperty(
          consoleObj,
          "log",
          interpreter.createNativeFunction(consoleLogWrapper)
        );
        interpreter.setProperty(globalObject, "console", consoleObj);

        // Add a debugging function to dump all variables
        const variablesWrapper = function () {
          console.log("=== Dumping all global variables ===");
          for (const [key, variable] of Object.entries(envVariables)) {
            const propValue = interpreter.getProperty(globalObject, key);
            console.log(`${key}:`, propValue);
          }
          console.log("=== End dump ===");
          return undefined;
        };
        interpreter.setProperty(
          globalObject,
          "allVariables",
          interpreter.createNativeFunction(variablesWrapper)
        );
      };

      // Create interpreter with the code and proper variable setup
      return new window.Interpreter(currentCode, initFunc);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Code error: ${errorMessage}`);
      return null;
    }
  };

  // Get current interpreter state
  const getCurrentState = (
    interpreter: any,
    stepNumber: number
  ): DebugState => {
    const stack = interpreter.getStateStack();
    const node = stack.length ? stack[stack.length - 1].node : null;

    const variables: Record<string, any> = {};

    try {
      // Get all declared variable names from the code
      const declaredVariables = extractVariableNames(currentCode);
      console.log("Declared variables found in code:", declaredVariables);

      // Helper function to extract variables from a specific scope
      const extractVariablesFromScope = (scope: any, scopeName: string) => {
        console.log(`extractVariablesFromScope called for ${scopeName}`);

        if (!scope?.object?.properties) {
          console.log(`${scopeName}: No scope.object.properties`);
          return {};
        }

        console.log(
          `${scopeName}: Found properties:`,
          Object.keys(scope.object.properties)
        );

        const scopeVars: Record<string, any> = {};

        for (const [key, value] of Object.entries(scope.object.properties)) {
          console.log(`${scopeName}: Processing property ${key}`, value);

          // Skip interpreter internal variables
          if (
            key === "console" ||
            key === "undefined" ||
            key === "allVariables" ||
            key === "executeManualFunction" ||
            key === "getVariablesJSON"
          ) {
            console.log(`${scopeName}: Skipping internal variable ${key}`);
            continue;
          }

          try {
            const propValue = interpreter.getProperty(scope.object, key);
            console.log(
              `${scopeName}: Got property value for ${key}:`,
              propValue
            );

            // Use pseudoToNative to convert pseudo objects to native objects for display
            if (
              propValue !== undefined &&
              propValue !== null &&
              interpreter.pseudoToNative
            ) {
              try {
                const nativeValue = interpreter.pseudoToNative(propValue);
                scopeVars[key] = nativeValue;
                console.log(
                  `${scopeName}: Converted ${key} to native:`,
                  nativeValue
                );
              } catch (convertErr) {
                // If conversion fails, show the raw value
                scopeVars[key] = propValue;
                console.log(
                  `${scopeName}: Conversion failed for ${key}, using raw value:`,
                  propValue
                );
              }
            } else {
              // For primitive values
              scopeVars[key] = propValue;
              console.log(
                `${scopeName}: Using primitive value for ${key}:`,
                propValue
              );
            }
          } catch (err) {
            console.error(
              `Error accessing variable ${key} in ${scopeName}:`,
              err
            );
            scopeVars[key] = `[Error: ${err}]`;
          }
        }

        console.log(`${scopeName}: Final extracted variables:`, scopeVars);
        return scopeVars;
      };

      // Special handling for VariableDeclaration nodes
      if (node && node.type === "VariableDeclaration") {
        variables["[🔍 Variable Declaration Detected]"] = true;

        // Try to extract the variable names being declared
        if (node.declarations && Array.isArray(node.declarations)) {
          const declaredVars: Record<string, any> = {};

          for (const declaration of node.declarations) {
            if (declaration.id && declaration.id.name) {
              const varName = declaration.id.name;

              // Try to get the current value from the current scope
              if (stack.length > 0) {
                const currentState = stack[stack.length - 1];
                if (currentState.scope && currentState.scope.object) {
                  try {
                    const propValue = interpreter.getProperty(
                      currentState.scope.object,
                      varName
                    );
                    if (propValue !== undefined) {
                      const nativeValue = interpreter.pseudoToNative
                        ? interpreter.pseudoToNative(propValue)
                        : propValue;
                      declaredVars[varName] = nativeValue;
                      variables[`[🆕 Declared] ${varName}`] = nativeValue;
                    }
                  } catch (err) {
                    declaredVars[varName] = `[Error: ${err}]`;
                  }
                }
              }
            }
          }

          if (Object.keys(declaredVars).length > 0) {
            variables["[Current Declarations]"] = declaredVars;
          }
        }
      }

      // Special handling for AssignmentExpression nodes (for tracking assignments like xi = xValues[i])
      if (node && node.type === "AssignmentExpression") {
        variables["[📝 Assignment Detected]"] = true;

        if (node.left && node.left.name) {
          const varName = node.left.name;
          variables[`[Assignment Target]`] = varName;

          // Try to get the value being assigned
          if (stack.length > 0) {
            const currentState = stack[stack.length - 1];
            if (currentState.scope && currentState.scope.object) {
              try {
                const propValue = interpreter.getProperty(
                  currentState.scope.object,
                  varName
                );
                if (propValue !== undefined) {
                  const nativeValue = interpreter.pseudoToNative
                    ? interpreter.pseudoToNative(propValue)
                    : propValue;
                  variables[`[📝 Assigned] ${varName}`] = nativeValue;
                }
              } catch (err) {
                variables[`[📝 Assigned] ${varName}`] = `[Error: ${err}]`;
              }
            }
          }
        }
      }

      // Extract variables from all scopes in the state stack (most recent first)
      if (stack && stack.length > 0) {
        console.log(`=== Examining ${stack.length} stack frames ===`);

        for (let i = stack.length - 1; i >= 0; i--) {
          const state = stack[i];
          const scopeName =
            i === 0 ? "Global" : `Local-${stack.length - 1 - i}`;

          console.log(`Frame ${i} (${scopeName}):`, {
            hasScope: !!state.scope,
            hasObject: !!state.scope?.object,
            hasProperties: !!state.scope?.object?.properties,
            nodeType: state.node?.type,
            functionName: state.func?.node?.id?.name,
          });

          if (state.scope && state.scope.object) {
            // Debug: Show all properties in this scope
            if (state.scope.object.properties) {
              console.log(
                `${scopeName} scope properties:`,
                Object.keys(state.scope.object.properties)
              );

              // Special debug for local scopes - show all variables
              if (i > 0) {
                for (const [key, value] of Object.entries(
                  state.scope.object.properties
                )) {
                  console.log(`  ${scopeName}.${key}:`, value);
                  try {
                    const propValue = interpreter.getProperty(
                      state.scope.object,
                      key
                    );
                    console.log(`  ${scopeName}.${key} (accessed):`, propValue);
                  } catch (err) {
                    console.log(`  ${scopeName}.${key} (error):`, err);
                  }
                }
              }
            }

            const scopeVars = extractVariablesFromScope(state.scope, scopeName);
            console.log(`Extracted from ${scopeName}:`, scopeVars);

            // Add variables from this scope
            for (const [key, value] of Object.entries(scopeVars)) {
              // Local variables take precedence over global ones
              if (!(key in variables) || i > 0) {
                variables[key] = value;
              }

              // Also add with scope prefix for debugging
              variables[`[${scopeName}] ${key}`] = value;
            }
          } else {
            console.log(`${scopeName} scope has no object or properties`);
          }
        }
      }

      // Automatically check for all declared variables in all scopes
      console.log("=== AUTOMATIC CHECK FOR ALL DECLARED VARIABLES ===");
      if (stack && stack.length > 0 && declaredVariables.length > 0) {
        for (const varName of declaredVariables) {
          console.log(`Checking for declared variable: ${varName}`);

          // Check in all stack frames
          for (let i = stack.length - 1; i >= 0; i--) {
            const state = stack[i];
            const scopeName =
              i === 0 ? "Global" : `Local-${stack.length - 1 - i}`;

            if (state.scope && state.scope.object) {
              try {
                const varValue = interpreter.getProperty(
                  state.scope.object,
                  varName
                );
                if (varValue !== undefined) {
                  console.log(
                    `${scopeName}: Found declared variable '${varName}':`,
                    varValue
                  );
                  const nativeValue = interpreter.pseudoToNative
                    ? interpreter.pseudoToNative(varValue)
                    : varValue;
                  variables[`[DECLARED] ${varName}`] = nativeValue;

                  // Also add without prefix for easier access
                  if (!(varName in variables)) {
                    variables[varName] = nativeValue;
                  }
                  break; // Found it, no need to check other scopes
                }
              } catch (err) {
                console.log(
                  `${scopeName}: Error checking declared variable '${varName}':`,
                  err
                );
              }
            }
          }
        }
      }

      // Also get the global scope as a fallback
      const globalScope = interpreter.getGlobalScope();
      if (globalScope?.object?.properties) {
        const globalVars = extractVariablesFromScope(globalScope, "Global");

        // Add global variables that haven't been seen yet
        for (const [key, value] of Object.entries(globalVars)) {
          if (!(key in variables)) {
            variables[key] = value;
          }
        }
      }

      // Capture the interpreter's current value (result of last statement)
      if (interpreter.value !== undefined) {
        try {
          variables["[Interpreter Value]"] = interpreter.pseudoToNative
            ? interpreter.pseudoToNative(interpreter.value)
            : interpreter.value;
        } catch {
          variables["[Interpreter Value]"] = interpreter.value;
        }
      }

      // Add debugging info about execution state
      variables["[Current Node Type]"] = node?.type || "Unknown";
      variables["[Stack Depth]"] = stack?.length || 0;
      variables["[Declared Variables]"] = declaredVariables;

      // Add more detailed node information
      if (node) {
        variables["[Node Info]"] = {
          type: node.type,
          start: node.start,
          end: node.end,
          ...(node.type === "Identifier" && { name: node.name }),
          ...(node.type === "VariableDeclaration" && {
            declarations: node.declarations
              ?.map((d: any) => d.id?.name)
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
        const currentState = stack[stack.length - 1];
        if (currentState.scope) {
          variables["[Current Scope Type]"] =
            currentState.scope.constructor.name;
        }
        if (currentState.func && currentState.func.node) {
          variables["[Current Function]"] =
            currentState.func.node.id?.name || "Anonymous";
        }
      }

      console.log("All extracted variables from all scopes:", variables);
    } catch (err) {
      console.warn("Error extracting variables:", err);
      variables["[Error]"] = `Could not extract variables: ${err}`;
    }

    return {
      step: stepNumber,
      codeHighlight: { start: node?.start || 0, end: node?.end || 0 },
      variables,
      stackTrace: stack.map(
        (s: any, i: number) =>
          `Frame ${i}: ${s.node?.type || "Unknown"}${s.func?.node?.id?.name ? ` (${s.func.node.id.name})` : ""}`
      ),
      timestamp: Date.now(),
    };
  };

  // Highlight code in CodeMirror
  const highlightCode = (start: number, end: number) => {
    if (codeMirrorRef.current) {
      const view = codeMirrorRef.current.view;
      if (view) {
        // Convert character positions to CodeMirror positions
        const doc = view.state.doc;
        const startPos = Math.min(start, doc.length);
        const endPos = Math.min(end, doc.length);

        // Set selection in CodeMirror
        view.dispatch({
          selection: { anchor: startPos, head: endPos },
          scrollIntoView: true,
        });
      }
    }
  };

  // Start debugging
  const startDebugging = () => {
    if (!currentCode.trim()) {
      setError("No code to debug");
      return;
    }

    const newInterpreter = initializeInterpreter();
    if (!newInterpreter) return;

    setInterpreter(newInterpreter);
    setDebugHistory([]);
    setIsComplete(false);
    setError(null);
    setIsRunning(false);

    // Add initial state
    const initialState = getCurrentState(newInterpreter, 0);
    setDebugHistory([initialState]);
    highlightCode(
      initialState.codeHighlight.start,
      initialState.codeHighlight.end
    );
  };

  // Step forward
  const stepForward = () => {
    if (!interpreter || isComplete) return;

    try {
      const canContinue = interpreter.step();
      const newState = getCurrentState(interpreter, debugHistory.length);

      setDebugHistory((prev) => [...prev, newState]);
      highlightCode(newState.codeHighlight.start, newState.codeHighlight.end);

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
    if (debugHistory.length <= 1) return;

    const previousState = debugHistory[debugHistory.length - 2];
    highlightCode(
      previousState.codeHighlight.start,
      previousState.codeHighlight.end
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
    setDebugHistory([]);
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

  const currentState = debugHistory[debugHistory.length - 1];
  const hasSteps = debugHistory.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Function Step-Through"
      maxWidth="max-w-6xl"
    >
      <div className="h-[85vh] flex flex-col">
        {/* Controls Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              onClick={startDebugging}
              disabled={isRunning}
              icon="🔄"
              px="px-4"
            >
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
              disabled={debugHistory.length <= 1 || isRunning}
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
          </div>

          <select
            value={autoPlaySpeed}
            onChange={(e) => setAutoPlaySpeed(Number(e.target.value))}
            className="border rounded-xl px-3 py-2 border-slate-200"
          >
            <option value={100}>Fast (100ms)</option>
            <option value={300}>Medium (300ms)</option>
            <option value={500}>Normal (500ms)</option>
            <option value={1000}>Slow (1s)</option>
            <option value={2000}>Very Slow (2s)</option>
          </select>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 border-b">
          <div className="flex justify-between items-center">
            <span>
              {hasSteps && (
                <>
                  <strong>Steps: {debugHistory.length}</strong>
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
              value={currentCode}
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
                  <pre className="text-sm bg-blue-50 p-3 rounded border whitespace-pre-wrap">
                    {Object.keys(currentState.variables).length > 0
                      ? JSON.stringify(currentState.variables, null, 2)
                      : "No variables captured yet"}
                  </pre>
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
                  Total Steps: {debugHistory.length} | Auto-playing:{" "}
                  {isRunning ? "Yes" : "No"}
                </div>
                {debugHistory.map((state, index) => {
                  return (
                    <div
                      key={index}
                      className={`mb-2 p-3 border rounded-xl transition-colors bg-slate-50 border-slate-200`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-semibold text-sm">
                          Step {index}
                          {index === debugHistory.length - 1 && (
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
                        Code position: {state.codeHighlight.start}-
                        {state.codeHighlight.end}
                      </div>
                      {state.stackTrace.length > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          Stack: {state.stackTrace[state.stackTrace.length - 1]}
                        </div>
                      )}
                    </div>
                  );
                })}
                {debugHistory.length === 0 && (
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
