import { extractVariableNames } from "../util/acorn";
import { DEBUG_VARIABLE_NAMES } from "./constants";
import {
  JSInterpreter,
  StackFrame,
  collectVariablesFromStack,
} from "./interpreter";

export class VariableExtractor {
  /**
   * Extracts all available variables from the current interpreter state for debugging.
   *
   * This function creates a comprehensive snapshot of the execution state by:
   * 1. Parsing the code to find all declared variable names
   * 2. Collecting current values of those variables from the interpreter's execution stack
   * 3. Adding interpreter metadata (current value, node info, scope info)
   * 4. Including debug information about the current execution context
   *
   * The returned object contains both user variables (from the code) and debug variables
   * (prefixed with special names like "[Error]", "Current Node Type", etc.) that help
   * understand the interpreter's internal state during step-by-step execution.
   *
   * @param interpreter - The JS interpreter instance executing the code
   * @param stack - Current execution stack frames from the interpreter
   * @param code - The source code being executed (used to extract variable names)
   * @returns Object containing all variables and debug info for the current execution step
   */
  static extractVariables(
    interpreter: JSInterpreter,
    stack: StackFrame[],
    code: string
  ): Record<string, unknown> {
    const variables: Record<string, unknown> = {};
    try {
      const varNames = extractVariableNames(code);
      const extractedVariables = collectVariablesFromStack(
        interpreter,
        stack,
        varNames
      );
      Object.assign(variables, extractedVariables);
      this.addInterpreterValue(interpreter, variables);
      this.addNodeDebugInfo(stack, variables, varNames);
      this.addScopeInfo(stack, variables);
    } catch (err) {
      console.warn("Error extracting variables:", err);
      variables[DEBUG_VARIABLE_NAMES.ERROR] =
        `${DEBUG_VARIABLE_NAMES.ERROR}: ${err}`;
    }
    return variables;
  }

  private static addInterpreterValue(
    interpreter: JSInterpreter,
    variables: Record<string, unknown>
  ): void {
    if (interpreter.value !== undefined) {
      try {
        variables[DEBUG_VARIABLE_NAMES.INTERPRETER_VALUE] =
          interpreter.pseudoToNative
            ? interpreter.pseudoToNative(interpreter.value)
            : interpreter.value;
      } catch {
        variables[DEBUG_VARIABLE_NAMES.INTERPRETER_VALUE] = interpreter.value;
      }
    }
  }

  private static addNodeDebugInfo(
    stack: StackFrame[],
    variables: Record<string, unknown>,
    varNames: string[]
  ): void {
    const node = stack.length ? stack[stack.length - 1].node : null;
    variables[DEBUG_VARIABLE_NAMES.CURRENT_NODE_TYPE] = node?.type || "Unknown";
    variables[DEBUG_VARIABLE_NAMES.STACK_DEPTH] = stack?.length || 0;
    variables[DEBUG_VARIABLE_NAMES.DECLARED_VARIABLES] = varNames;
    if (node) {
      variables[DEBUG_VARIABLE_NAMES.NODE_INFO] = this.buildNodeInfo(node);
    }
  }

  private static buildNodeInfo(node: any): Record<string, unknown> {
    const nodeInfo: Record<string, unknown> = {
      type: node.type,
      start: node.start,
      end: node.end,
    };
    if (node.type === "Identifier") {
      nodeInfo.name = node.name;
    } else if (node.type === "VariableDeclaration") {
      nodeInfo.declarations = node.declarations
        ?.map((d: { id?: { name: string } }) => d.id?.name)
        .filter(Boolean);
    } else if (node.type === "AssignmentExpression") {
      nodeInfo.operator = node.operator;
      nodeInfo.leftName = node.left?.name;
    } else if (node.type === "BinaryExpression") {
      nodeInfo.operator = node.operator;
      nodeInfo.left = node.left?.type;
      nodeInfo.right = node.right?.type;
    }
    return nodeInfo;
  }

  private static addScopeInfo(
    stack: StackFrame[],
    variables: Record<string, unknown>
  ): void {
    if (stack && stack.length > 0) {
      const currentState = stack[stack.length - 1];
      if (currentState.scope) {
        variables[DEBUG_VARIABLE_NAMES.CURRENT_SCOPE_TYPE] =
          currentState.scope.constructor.name;
      }
      if (currentState.func && currentState.func.node) {
        variables[DEBUG_VARIABLE_NAMES.CURRENT_FUNCTION] =
          currentState.func.node.id?.name || "Anonymous";
      }
    }
  }
}
