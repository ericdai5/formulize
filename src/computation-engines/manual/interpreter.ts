/**
 * JS-Interpreter utility functions for manual computation debugging
 */
import { IStep } from "../../types/step";
import { IVariable } from "../../types/variable";

// Window interface extension for JS-Interpreter
declare global {
  interface Window {
    Interpreter: InterpreterConstructor;
  }
}

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
  // Custom property to store current view parameters
  _currentViewParams?: {
    pairs?: Array<[string, string]>;
  };
}

interface InterpreterConstructor {
  new (
    code: string,
    initFunc?: (interpreter: JSInterpreter, globalObject: unknown) => void
  ): JSInterpreter;
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
 * Check if the interpreter is currently about to execute a view() function call
 * @param interpreter - The JS-Interpreter instance
 * @returns boolean indicating if we're at a view() breakpoint
 */
const isAtView = (interpreter: JSInterpreter): boolean => {
  if (!interpreter) return false;
  try {
    const stack = interpreter.getStateStack();
    if (!stack || stack.length === 0) return false;
    // Check stack frames from most recent backwards, looking for view() call context
    // Stop when we find frames that are clearly unrelated to a view() call
    for (let i = stack.length - 1; i >= 0; i--) {
      const frame = stack[i] as StackFrame;
      if (frame?.node) {
        const node = frame.node;
        if (node.callee?.name === "view") {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking for view() breakpoint:", error);
    return false;
  }
};

/**
 * Check if the current history index represents a block statement after a target position
 * This function identifies when we're at the beginning of a block statement (like if, for, while, function body)
 * that follows a meaningful target statement - matches the logic from interpreter.tsx
 * @param history - Array of debug states
 * @param currentIndex - Current index in the history
 * @returns boolean indicating if we're at a block statement after target
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
    // Check if current state's last stack frame is BlockStatement
    const currentLastFrame = current.stackTrace[current.stackTrace.length - 1];
    const isCurrentBlock = currentLastFrame?.includes("BlockStatement");
    // Check if previous state's last stack frame was NOT a BlockStatement
    const prevLastFrame = prev.stackTrace[prev.stackTrace.length - 1];
    const isPreviousNotBlock = !prevLastFrame?.includes("BlockStatement");

    // We're at a block when we enter a BlockStatement from a non-BlockStatement
    // This ensures we highlight the BlockStatement itself, not the statement after it
    return isCurrentBlock && isPreviousNotBlock;
  } catch (error) {
    console.error("Error checking for block statement:", error);
    return false;
  }
};

/**
 * Initialize JS-Interpreter with environment variables and debugging utilities
 * @param currentCode - The JavaScript code to execute
 * @param environment - The Formulize environment containing variables
 * @param setError - Error callback function
 * @param variables - Resolved variables from computation store
 * @returns Initialized interpreter instance or null if failed
 */
export const initializeInterpreter = (
  currentCode: string,
  setError: (error: string) => void,
  variables: Record<string, IVariable>
): JSInterpreter | null => {
  if (!window.Interpreter) {
    setError("JS-Interpreter not loaded.");
    return null;
  }
  if (!currentCode.trim()) {
    setError("No code available to execute");
    return null;
  }

  try {
    // Create initialization function to set up variables properly
    const initFunc = (interpreter: JSInterpreter, globalObject: unknown) => {
      const variablesToUse = variables;

      // Set up each variable as a global property for tracking
      for (const [key, variable] of Object.entries(variablesToUse)) {
        try {
          // Convert the variable to a pseudo object that the interpreter can track
          const pseudoVariable = interpreter.nativeToPseudo(variable);
          interpreter.setProperty(globalObject, key, pseudoVariable);
        } catch (err) {
          console.error(`Error setting up variable ${key}:`, err);
          // Fallback to setting as primitive value
          interpreter.setProperty(globalObject, key, variable);
        }
      }

      // Set up the view() function as a breakpoint trigger
      // This function acts as a breakpoint marker
      // When called, it signals that execution should pause
      const view = function () {
        return undefined;
      };
      interpreter.setProperty(
        globalObject,
        "view",
        interpreter.createNativeFunction(view)
      );

      // Also provide the getVariablesJSON function
      const getVariablesJSON = function () {
        // Variables are already cleaned by toJS() in computation store
        return JSON.stringify(variablesToUse);
      };
      interpreter.setProperty(
        globalObject,
        "getVariablesJSON",
        interpreter.createNativeFunction(getVariablesJSON)
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

export {
  getScopeName,
  convertToNativeValue,
  findVariableInFrame,
  findVariableInStack,
  collectVariablesFromStack,
  isAtView,
  isAtBlock,
};

export type { JSInterpreter, StackFrame };
