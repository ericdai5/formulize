/**
 * JS-Interpreter utility functions for manual computation debugging
 */
import { IEnvironment } from "../../../types/environment";

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
      console.log(`${scopeName}: Found variable '${varName}':`, varValue);
      const nativeValue = convertToNativeValue(interpreter, varValue);
      return { found: true, value: nativeValue, scopeName };
    }
  } catch (err) {
    console.log(
      `${scopeName}: Error checking declared variable '${varName}':`,
      err
    );
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
    console.log(`Checking for variable: ${varName}`);
    const result = findVariableInStack(interpreter, stack, varName);
    if (result.found && result.value !== undefined && !(varName in variables)) {
      variables[varName] = result.value;
    }
  }

  return variables;
};

/**
 * Check if the interpreter is currently about to execute a view() function call
 * This replaces the old comment-based breakpoint checking system
 * @param interpreter - The JS-Interpreter instance
 * @returns boolean indicating if we're at a view() breakpoint
 */
const isAtView = (interpreter: JSInterpreter): boolean => {
  if (!interpreter) return false;

  try {
    const stack = interpreter.getStateStack();
    if (!stack || stack.length === 0) return false;

    // Check the current execution stack frame
    const currentFrame = stack[stack.length - 1] as StackFrame;

    if (currentFrame?.node) {
      const node = currentFrame.node;

      // Check for CallExpression where callee is an Identifier named 'view'
      if (
        node.type === "CallExpression" &&
        node.callee?.type === "Identifier" &&
        node.callee?.name === "view"
      ) {
        console.log("Detected view() function call breakpoint");
        return true;
      }

      // Also check for ExpressionStatement containing a CallExpression to view()
      if (node.type === "ExpressionStatement") {
        // The expression property might contain the actual call
        const expression = node.expression;
        if (
          expression?.type === "CallExpression" &&
          expression.callee?.type === "Identifier" &&
          expression.callee?.name === "view"
        ) {
          console.log(
            "Detected view() function call breakpoint in expression statement"
          );
          return true;
        }
      }

      // Check if we're in the middle of processing a CallExpression
      // and the state contains information about calling 'view'
      if (node.type === "CallExpression") {
        // Check if we're currently processing the callee and it's 'view'
        if (currentFrame.doneCallee_ && currentFrame.func_) {
          // We've evaluated the callee, check if it's our view function
          if (
            node.callee?.type === "Identifier" &&
            node.callee?.name === "view"
          ) {
            console.log("Detected view() function call during execution phase");
            return true;
          }
        }
      }

      // Additional check: look at the raw node to see if we're about to execute view()
      if (
        node.type === "Identifier" &&
        node.name === "view" &&
        stack.length > 1
      ) {
        // Check the parent context to see if this identifier is part of a call
        const parentFrame = stack[stack.length - 2] as StackFrame;
        if (
          parentFrame?.node?.type === "CallExpression" &&
          parentFrame.node.callee === node
        ) {
          console.log("Detected view() identifier about to be called");
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
 * Initialize JS-Interpreter with environment variables and debugging utilities
 * @param currentCode - The JavaScript code to execute
 * @param environment - The Formulize environment containing variables
 * @param setError - Error callback function
 * @returns Initialized interpreter instance or null if failed
 */
export const initializeInterpreter = (
  currentCode: string,
  environment: IEnvironment | null,
  setError: (error: string) => void
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

      // Set up the view() function as a breakpoint trigger
      // This function acts as a breakpoint marker
      // When called, it signals that execution should pause
      // Store all pairs on the interpreter instance
      const view = function (...args: unknown[]) {
        if (args.length === 1 && Array.isArray(args[0])) {
          const pairs = args[0] as Array<[string, string]>;
          interpreter._currentViewParams = { pairs };
        } else {
          interpreter._currentViewParams = {};
        }

        return undefined;
      };
      interpreter.setProperty(
        globalObject,
        "view",
        interpreter.createNativeFunction(view)
      );

      // Also provide the getVariablesJSON function
      const getVariablesJSON = function () {
        return JSON.stringify(envVariables);
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
};

export type { JSInterpreter, StackFrame };
