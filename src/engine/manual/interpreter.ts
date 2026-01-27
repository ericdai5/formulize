/**
 * JS-Interpreter utility functions for manual computation debugging
 */
import Interpreter from "js-interpreter";

import { IStep, IView } from "../../types/step";
import { IValue } from "../../types/variable";

// Comprehensive interface for JS-Interpreter
interface JSInterpreter {
  step(): boolean;
  run(): boolean;
  value: unknown;
  getStateStack(): unknown[];
  getGlobalScope(): unknown;
  setProperty(obj: unknown, name: string, value: unknown): void;
  getProperty(obj: unknown, name: string): unknown;
  createNativeFunction(func: (...args: unknown[]) => unknown): unknown;
  nativeToPseudo(obj: unknown): unknown;
  pseudoToNative?(obj: unknown): unknown;
  // Custom property to store captured view parameters
  _capturedView?: IView;
}

interface StackFrame {
  node?: {
    type: string;
    start: number;
    end: number;
    name?: string;
    declarations?: Array<{ id?: { name: string } }>;
    operator?: string;
    left?: { name?: string; type?: string };
    right?: { type?: string };
    callee?: { name?: string; type?: string };
    arguments?: Array<unknown>; // Generic AST nodes - let runtime handle the structure
    expression?: {
      type?: string;
      callee?: { name?: string; type?: string };
    };
  };
  scope?: {
    object: unknown;
    constructor: { name: string };
  };
  func?: {
    node?: {
      id?: { name: string };
    };
  };
  // Interpreter state properties
  doneCallee_?: boolean;
  func_?: unknown;
}

// Helper function to get scope name based on stack position
const getScopeName = (index: number, stackLength: number): string => {
  return index === 0 ? "Global" : `Local-${stackLength - 1 - index}`;
};

// Helper function to convert interpreter value to native value
const convertToNativeValue = (interpreter: JSInterpreter, value: unknown) => {
  return interpreter.pseudoToNative ? interpreter.pseudoToNative(value) : value;
};

// Helper function to find a variable in a specific stack frame
const findVariableInFrame = (
  interpreter: JSInterpreter,
  state: unknown,
  varName: string,
  frameIndex: number,
  stackLength: number
): { found: boolean; value?: unknown; scopeName: string } => {
  const scopeName = getScopeName(frameIndex, stackLength);
  const stackFrame = state as StackFrame;
  if (!stackFrame.scope?.object) {
    return { found: false, scopeName };
  }
  try {
    const varValue = interpreter.getProperty(stackFrame.scope.object, varName);
    if (varValue !== undefined) {
      const nativeValue = convertToNativeValue(interpreter, varValue);
      return { found: true, value: nativeValue, scopeName };
    }
  } catch (err) {
    // Error checking declared variable - continue to next scope
  }

  return { found: false, scopeName };
};

// Helper function to find a variable in the stack (searching from innermost to outermost)
const findVariableInStack = (
  interpreter: JSInterpreter,
  stack: unknown[],
  varName: string
) => {
  for (let i = stack.length - 1; i >= 0; i--) {
    const result = findVariableInFrame(
      interpreter,
      stack[i],
      varName,
      i,
      stack.length
    );
    if (result.found) {
      return result;
    }
  }
  return { found: false, value: undefined, scopeName: "" };
};

// Helper function to collect all variables from the stack
const collectVariablesFromStack = (
  interpreter: JSInterpreter,
  stack: unknown[],
  varNames: string[]
) => {
  if (!stack?.length || !varNames?.length) {
    return {};
  }
  const variables: Record<string, unknown> = {};
  for (const varName of varNames) {
    const result = findVariableInStack(interpreter, stack, varName);
    if (result.found && result.value !== undefined && !(varName in variables)) {
      variables[varName] = result.value;
    }
  }
  return variables;
};

/**
 * Check if the current history index represents a block, switch, or return statement after a target position
 * This function identifies when we're at the beginning of a block statement (like if, for, while, function body),
 * switch statement, or a return statement that follows a meaningful target statement - matches the logic from interpreter.tsx
 * @param history - Array of debug states
 * @param currentIndex - Current index in the history
 * @returns boolean indicating if we're at a block, switch, or return statement after target
 */
const isAtBlock = (history: IStep[], currentIndex: number): boolean => {
  if (currentIndex === 0 || !history || history.length === 0) {
    return false;
  }
  try {
    const current = history[currentIndex];
    const prev = history[currentIndex - 1];
    if (!current || !prev) {
      return false;
    }
    // Check if current state's last stack frame is BlockStatement, SwitchStatement, or ReturnStatement
    const currentLastFrame = current.stackTrace[current.stackTrace.length - 1];
    const isCurrentBlock =
      currentLastFrame?.includes("BlockStatement") ||
      currentLastFrame?.includes("SwitchStatement") ||
      currentLastFrame?.includes("ReturnStatement");
    // Check if previous state's last stack frame was NOT a BlockStatement, SwitchStatement, or ReturnStatement
    const prevLastFrame = prev.stackTrace[prev.stackTrace.length - 1];
    const isPreviousNotBlock =
      !prevLastFrame?.includes("BlockStatement") &&
      !prevLastFrame?.includes("SwitchStatement") &&
      !prevLastFrame?.includes("ReturnStatement");
    // We're at a block when we enter a BlockStatement/SwitchStatement/ReturnStatement from a non-BlockStatement/SwitchStatement/ReturnStatement
    // This ensures we highlight the statement itself, not the statement after it
    return isCurrentBlock && isPreviousNotBlock;
  } catch (error) {
    console.error("Error checking for block/switch/return statement:", error);
    return false;
  }
};

/**
 * Initialize JS-Interpreter with variable values for step-through debugging
 * @param currentCode - The JavaScript code to execute
 * @param setError - Error callback function
 * @param values - Variable values (IValue) from computation store
 * @returns Initialized interpreter instance or null if failed
 */
export const initializeInterpreter = (
  currentCode: string,
  setError: (error: string) => void,
  values: Record<string, IValue>
): JSInterpreter | null => {
  if (!currentCode.trim()) {
    setError("No code available to execute");
    return null;
  }

  try {
    // Create initialization function to set up the vars object with values
    const initFunc = (interpreter: JSInterpreter, globalObject: unknown) => {
      // Create vars object directly from the values
      // This is cleaner - just the values, no IVariable wrapper objects
      const varsObject = interpreter.nativeToPseudo(values);
      interpreter.setProperty(globalObject, "vars", varsObject);
      // Set up the view() function as a breakpoint trigger that captures arguments
      // The function stores its arguments on the interpreter for later retrieval
      // Syntax: view(description, values, options?)
      // - description: string describing what is being shown
      // - values: Array of [varId, value] tuples mapping LaTeX variable IDs to runtime values
      // - options: optional object with { id?: string, expression?: string, formulaId?: string }
      // Examples:
      //   view("Get value x:", [["x", xi]])
      //   view("MSE calculation", [["m", m]], { expression: "\\frac{1}{m}" })
      //   view("Loss:", [["J", loss]], { expression: "...", formulaId: "loss-func" })
      //   view("Weight update", [["w", w]], { id: "weight-update", formulaId: "update-rule" })
      const view = function (
        description: unknown,
        valuesArg: unknown,
        optionsArg?: unknown
      ) {
        // Convert pseudo-objects to native objects if needed
        const nativeValues = interpreter.pseudoToNative
          ? interpreter.pseudoToNative(valuesArg)
          : valuesArg;
        const nativeOptions = optionsArg
          ? interpreter.pseudoToNative
            ? interpreter.pseudoToNative(optionsArg)
            : optionsArg
          : null;

        // Extract values from array of tuples: [["varId", value], ...]
        let values: Record<string, IValue> | undefined;
        if (Array.isArray(nativeValues)) {
          values = {};
          for (const tuple of nativeValues) {
            if (Array.isArray(tuple) && tuple.length >= 2) {
              const [varId, value] = tuple;
              if (typeof varId === "string") {
                values[varId] = value as IValue;
              }
            }
          }
        }

        // Extract id, expression and formulaId from options object
        let id: string | undefined;
        let expression: string | undefined;
        let formulaId: string | undefined;
        if (nativeOptions && typeof nativeOptions === "object") {
          const opts = nativeOptions as {
            id?: unknown;
            expression?: unknown;
            formulaId?: unknown;
          };
          id = opts.id ? String(opts.id) : undefined;
          expression = opts.expression ? String(opts.expression) : undefined;
          formulaId = opts.formulaId ? String(opts.formulaId) : undefined;
        }

        // Store captured parameters on the interpreter instance
        const capturedView = {
          id,
          description: String(description ?? ""),
          values,
          expression,
          formulaId,
        };
        interpreter._capturedView = capturedView;
        return undefined;
      };
      interpreter.setProperty(
        globalObject,
        "view",
        interpreter.createNativeFunction(view)
      );

      // Also provide the getVariablesJSON function for debugging
      const getVariablesJSON = function () {
        return JSON.stringify(values);
      };
      interpreter.setProperty(
        globalObject,
        "getVariablesJSON",
        interpreter.createNativeFunction(getVariablesJSON)
      );
    };

    // Create interpreter with the code and proper variable setup
    return new Interpreter(currentCode, initFunc) as JSInterpreter;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    setError(`Code error: ${errorMessage}`);
    return null;
  }
};

export {
  getScopeName,
  convertToNativeValue,
  findVariableInFrame,
  findVariableInStack,
  collectVariablesFromStack,
  isAtBlock,
};

export type { JSInterpreter, StackFrame };
