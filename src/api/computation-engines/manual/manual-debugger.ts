/**
 * Manual Computation Engine with JS-Interpreter for Formulize
 *
 * This module provides step-by-step debugging capability for manual computation,
 * allowing developers to trace JavaScript execution line by line using JS-Interpreter.
 */
import { IEnvironment } from "../../../types/environment";
import { IVariable } from "../../../types/variable";

// Import JS-Interpreter
interface InterpreterInstance {
  step(): boolean;
  run(): boolean;
  value: unknown;
  getStateStack(): unknown[];
  getGlobalScope(): unknown;
  setProperty(obj: unknown, name: string, value: unknown): void;
  createNativeFunction(func: (...args: unknown[]) => unknown): unknown;
  nativeToPseudo(obj: unknown): unknown;
  pseudoToNative?(obj: unknown): unknown;
  createObjectProto?(proto: unknown): unknown;
  serialize?(): unknown;
}

interface InterpreterConstructor {
  new (
    code: string,
    initFunc?: (interpreter: InterpreterInstance, globalObject: unknown) => void
  ): InterpreterInstance;
}

declare global {
  interface Window {
    Interpreter: InterpreterConstructor;
  }
}

export interface DebugStep {
  step: number;
  line?: number;
  code: string;
  variables: Record<string, IVariable>;
  stackTrace: string[];
  timestamp: number;
}

export interface DebugSession {
  formulaName: string;
  steps: DebugStep[];
  currentStep: number;
  isCompleted: boolean;
  result?: number;
  error?: string;
}

// Type for manual function
export type ManualFunction = (variables: Record<string, IVariable>) => number;

export interface FormulaWithManual {
  name: string;
  manual: ManualFunction;
}

export class ManualEngineDebugger {
  private interpreter: any;
  private debugSession: DebugSession | null = null;
  private stepCallback?: (step: DebugStep) => void;
  private maxSteps = 10000; // Prevent infinite loops

  constructor() {
    // Check if JS-Interpreter is available
    if (typeof window !== "undefined" && !window.Interpreter) {
      console.warn("JS-Interpreter not loaded. Please include interpreter.js");
    }
  }

  /**
   * Set a callback to be called on each execution step
   */
  setStepCallback(callback: (step: DebugStep) => void) {
    this.stepCallback = callback;
  }

  /**
   * Convert a function to a string for JS-Interpreter execution
   */
  private functionToString(func: ManualFunction): string {
    const funcStr = func.toString();

    // Extract the function body from arrow function or regular function
    let functionBody: string;

    if (funcStr.includes("=>")) {
      // Arrow function: (variables) => { ... }
      const arrowIndex = funcStr.indexOf("=>");
      const bodyStart = funcStr.indexOf("{", arrowIndex);
      const bodyEnd = funcStr.lastIndexOf("}");

      if (bodyStart !== -1 && bodyEnd !== -1) {
        functionBody = funcStr.substring(bodyStart + 1, bodyEnd).trim();
      } else {
        // Single expression arrow function
        functionBody = `return ${funcStr.substring(arrowIndex + 2).trim()};`;
      }
    } else {
      // Regular function
      const bodyStart = funcStr.indexOf("{");
      const bodyEnd = funcStr.lastIndexOf("}");
      functionBody = funcStr.substring(bodyStart + 1, bodyEnd).trim();
    }

    return functionBody;
  }

  /**
   * Execute a manual function with step-by-step debugging
   */
  async executeManualFunction(
    formula: FormulaWithManual,
    variables: Record<string, any>
  ): Promise<DebugSession> {
    if (!window.Interpreter) {
      throw new Error("JS-Interpreter not available");
    }

    // Initialize debug session
    this.debugSession = {
      formulaName: formula.name,
      steps: [],
      currentStep: 0,
      isCompleted: false,
    };

    try {
      // Convert function to executable code
      const functionBody = this.functionToString(formula.manual);
      const executableCode = `
        // Variables passed to the function
        var variables = ${JSON.stringify(variables)};
        
        // Manual function body
        ${functionBody}
      `;

      console.log("Executing code:", executableCode);

      // Create interpreter with initialization function
      const initFunc = (interpreter: any, globalObject: any) => {
        // Add console.log for debugging
        const wrapper = (text: any) => {
          console.log("Interpreter Log:", text);
          return undefined;
        };
        interpreter.setProperty(
          globalObject,
          "console",
          interpreter.nativeToPseudo({
            log: interpreter.createNativeFunction(wrapper),
          })
        );
      };

      this.interpreter = new window.Interpreter(executableCode, initFunc);

      // Execute step by step
      let stepCount = 0;
      while (this.interpreter.step() && stepCount < this.maxSteps) {
        stepCount++;

        // Create debug step
        const debugStep: DebugStep = {
          step: stepCount,
          code: executableCode,
          variables: this.getInterpreterVariables(),
          stackTrace: this.getStackTrace(),
          timestamp: Date.now(),
        };

        this.debugSession.steps.push(debugStep);

        // Call step callback if provided
        if (this.stepCallback) {
          this.stepCallback(debugStep);
        }

        // Small delay to allow for UI updates
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Get final result
      this.debugSession.result = this.interpreter.value;
      this.debugSession.isCompleted = true;

      console.log("Debug session completed:", this.debugSession);
      return this.debugSession;
    } catch (error) {
      this.debugSession.error =
        error instanceof Error ? error.message : String(error);
      this.debugSession.isCompleted = true;
      throw error;
    }
  }

  /**
   * Get current variables from the interpreter
   */
  private getInterpreterVariables(): Record<string, any> {
    if (!this.interpreter) return {};

    try {
      const scope = this.interpreter.getGlobalScope();
      const variables: Record<string, any> = {};

      // Extract variables from scope
      if (scope && scope.properties) {
        for (const [key, value] of scope.properties.entries()) {
          if (key !== "console" && key !== "undefined") {
            variables[key] = this.pseudoToNative(value);
          }
        }
      }

      return variables;
    } catch (error) {
      console.warn("Error getting interpreter variables:", error);
      return {};
    }
  }

  /**
   * Convert pseudo object to native JavaScript object
   */
  private pseudoToNative(pseudoObj: any): any {
    if (!pseudoObj || typeof pseudoObj !== "object") {
      return pseudoObj;
    }

    if (pseudoObj.isPrimitive) {
      return pseudoObj.data;
    }

    if (pseudoObj.properties) {
      const result: any = {};
      for (const [key, value] of pseudoObj.properties.entries()) {
        result[key] = this.pseudoToNative(value);
      }
      return result;
    }

    return pseudoObj;
  }

  /**
   * Get current stack trace
   */
  private getStackTrace(): string[] {
    if (!this.interpreter) return [];

    try {
      // This is a simplified stack trace - JS-Interpreter doesn't expose detailed stack info
      return [`Step ${this.debugSession?.steps.length || 0}`];
    } catch (error) {
      return ["Error getting stack trace"];
    }
  }

  /**
   * Get the current debug session
   */
  getDebugSession(): DebugSession | null {
    return this.debugSession;
  }

  /**
   * Reset the debugger
   */
  reset() {
    this.interpreter = null;
    this.debugSession = null;
  }
}

/**
 * Enhanced manual computation with debugging support
 */
export async function computeWithManualEngineDebugger(
  environment: IEnvironment,
  debuggerInstance?: ManualEngineDebugger
): Promise<{ result: Record<string, number>; debugSessions: DebugSession[] }> {
  const debugSessions: DebugSession[] = [];

  try {
    // Validate environment
    if (!environment || !environment.variables) {
      console.warn("Invalid environment: missing variables");
      return { result: {}, debugSessions };
    }

    if (!environment.formulas || environment.formulas.length === 0) {
      console.warn("⚠️ No formulas found in environment");
      return { result: {}, debugSessions };
    }

    // Get dependent variables
    const dependentVars = Object.entries(environment.variables)
      .filter(([, varDef]) => varDef.type === "dependent")
      .map(([varName]) => varName);

    if (dependentVars.length === 0) {
      console.warn("⚠️ No dependent variables found");
      return { result: {}, debugSessions };
    }

    const result: Record<string, number> = {};

    // Find formulas with manual functions
    const formulasWithManualFunctions = environment.formulas.filter(
      (formula) => formula.manual && typeof formula.manual === "function"
    );

    if (formulasWithManualFunctions.length === 0) {
      console.warn("⚠️ No formulas with manual functions found");
      return { result: {}, debugSessions };
    }

    // Create debugger if not provided
    const activeDebugger = debuggerInstance || new ManualEngineDebugger();

    // Execute manual functions with debugging
    for (const dependentVar of dependentVars) {
      let computed = false;

      for (const formula of formulasWithManualFunctions) {
        try {
          // Type guard: ensure manual function exists
          if (!formula.manual) {
            continue;
          }

          // Create formula with confirmed manual function
          const formulaWithManual: FormulaWithManual = {
            name: formula.name,
            manual: formula.manual,
          };

          // Execute with debugging
          const debugSession = await activeDebugger.executeManualFunction(
            formulaWithManual,
            environment.variables
          );

          debugSessions.push(debugSession);

          // Validate result
          if (
            typeof debugSession.result === "number" &&
            isFinite(debugSession.result)
          ) {
            result[dependentVar] = debugSession.result;
            computed = true;
            break;
          }
        } catch (error) {
          console.error(
            `Error executing manual function for formula "${formula.name}":`,
            error
          );
        }
      }

      if (!computed) {
        console.warn(
          `⚠️ No valid manual function found for dependent variable: ${dependentVar}`
        );
        result[dependentVar] = NaN;
      }
    }

    return { result, debugSessions };
  } catch (error) {
    console.error("Error computing with manual engine debugger:", error);
    return { result: {}, debugSessions };
  }
}
