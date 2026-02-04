/**
 * JS-Interpreter utility functions for manual computation debugging
 */
import Interpreter from "js-interpreter";

import {
  IView,
  IInterpreterStep,
  IStep,
} from "../types/step";
import { IValue } from "../types/variable";

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
  // Custom property to store captured step parameters
  _capturedStep?: IStep;
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
const isAtBlock = (
  history: IInterpreterStep[],
  currentIndex: number
): boolean => {
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
      // Set up the step() function as a breakpoint trigger that captures arguments
      // The function stores its arguments on the interpreter for later retrieval
      // New API:
      // - Single/all formulas: step({ description, values?, expression? }, id?)
      // - Multi-formula: step({ "formulaId": { description, values?, expression? }, ... }, id?)
      // Detection: if input has 'description' property, it's single/all-formula mode
      // Examples:
      //   step({ description: "Get value x:", values: [["x", xi]] })
      //   step({ description: "MSE", values: [["m", m]], expression: "\\frac{1}{m}" })
      //   step({ "loss-func": { description: "Loss", values: [["J", loss]] } })
      //   step({ "update-rule": { description: "Weight", values: [["w", w]] } }, "weight-update")
      const step = function (inputArg: unknown, idArg?: unknown) {
        // Convert pseudo-objects to native objects if needed
        const nativeInput = interpreter.pseudoToNative
          ? interpreter.pseudoToNative(inputArg)
          : inputArg;
        const id = idArg ? String(idArg) : undefined;

        // Helper to validate and extract values array
        const extractValues = (
          vals: unknown
        ): Array<[string, IValue]> | undefined => {
          if (!Array.isArray(vals)) return undefined;
          const result: Array<[string, IValue]> = [];
          for (const tuple of vals) {
            if (
              Array.isArray(tuple) &&
              tuple.length >= 2 &&
              typeof tuple[0] === "string"
            ) {
              result.push([tuple[0], tuple[1] as IValue]);
            }
          }
          return result.length > 0 ? result : undefined;
        };

        // Build the captured step in IStep format
        const capturedStep: IStep = { id, formulas: {} };

        if (nativeInput && typeof nativeInput === "object") {
          const input = nativeInput as Record<string, unknown>;

          if ("description" in input) {
            // Single step mode - use empty string key for "all formulas"
            capturedStep.formulas[""] = {
              description: String(input.description ?? ""),
              values: extractValues(input.values),
              expression: input.expression
                ? String(input.expression)
                : undefined,
            };
          } else {
            // Multi-formula mode - keys are formulaIds
            for (const [formulaId, step] of Object.entries(input)) {
              const stepData = step as IView;
              capturedStep.formulas[formulaId] = {
                description: String(stepData.description ?? ""),
                values: extractValues(stepData.values),
                expression: stepData.expression
                  ? String(stepData.expression)
                  : undefined,
              };
            }
          }
        }

        interpreter._capturedStep = capturedStep;
        return undefined;
      };
      interpreter.setProperty(
        globalObject,
        "step",
        interpreter.createNativeFunction(step)
      );

      // Set up data2d() and data3d() functions as no-ops for the interpreter
      // These are used for visualization data collection in computation.ts,
      // but in the step-through interpreter they should execute atomically
      // without creating additional interpreter steps
      const data2d = function (_id: unknown, _values: unknown) {
        // No-op for interpreter - actual data collection happens in computation store
        return undefined;
      };
      interpreter.setProperty(
        globalObject,
        "data2d",
        interpreter.createNativeFunction(data2d)
      );

      const data3d = function (_id: unknown, _values: unknown) {
        // No-op for interpreter - actual data collection happens in computation store
        return undefined;
      };
      interpreter.setProperty(
        globalObject,
        "data3d",
        interpreter.createNativeFunction(data3d)
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
