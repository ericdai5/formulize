import { applyCue, updateVariables } from "../../rendering/interaction/step-handler";
import { computationStore } from "../../store/computation";
import { DEBUG_VARIABLE_NAMES, ERROR_MESSAGES } from "./constants";
import {
  JSInterpreter,
  StackFrame,
  collectVariablesFromStack,
  isAtView,
} from "./interpreter";

export class View {
  static processView(
    interpreter: JSInterpreter,
    stack: StackFrame[]
  ): Record<string, unknown> {
    const atView = isAtView(interpreter);
    let viewVariables: Record<string, unknown> = {};
    if (atView) {
      viewVariables = this.extractViewVariables(interpreter, stack);
    } else {
      computationStore.clearActiveIndices();
    }
    return viewVariables;
  }

  private static extractViewVariables(
    interpreter: JSInterpreter,
    stack: StackFrame[]
  ): Record<string, unknown> {
    const currentFrame = stack[stack.length - 1];
    if (!this.isValidViewFrame(currentFrame)) {
      return {};
    }
    try {
      const pairs = this.extractViewParameters(currentFrame);
      if (pairs.length === 0) {
        return {};
      }
      const viewVarNames = pairs.flatMap(([varName, , indexVar]) =>
        indexVar ? [varName, indexVar] : [varName]
      );
      const viewVariables = collectVariablesFromStack(
        interpreter,
        stack,
        viewVarNames
      );
      const updatedVarIds = updateVariables(viewVariables, pairs);
      // IMPORTANT: Apply cues in a requestAnimationFrame
      // This is to ensure the Formula Tree is already finished updating
      // Otherwise, the cues will be applied too early and the styles will be removed too early
      requestAnimationFrame(() => {
        applyCue(updatedVarIds);
      });
      this.updateActiveIndices(pairs, viewVariables);
      return viewVariables;
    } catch (err) {
      console.warn("Error extracting view parameters:", err);
      return {
        [DEBUG_VARIABLE_NAMES.VIEW_ERROR]: `${ERROR_MESSAGES.VIEW_EXTRACTION_ERROR}: ${err}`,
      };
    }
  }

  private static isValidViewFrame(frame: StackFrame): boolean {
    const firstArg = frame?.node?.arguments?.[0] as any;
    return (
      frame?.node?.callee?.name === "view" &&
      firstArg?.type === "ArrayExpression" &&
      firstArg?.elements
    );
  }

  private static extractViewParameters(
    frame: StackFrame
  ): Array<[string, string, string?]> {
    const firstArg = frame.node?.arguments?.[0] as any;
    if (!firstArg?.elements) return [];
    const pairs: Array<[string, string, string?]> = [];
    for (const element of firstArg.elements) {
      if (
        element.type === "ArrayExpression" &&
        element.elements &&
        element.elements.length >= 2
      ) {
        const [first, second, third] = element.elements;
        if (first.type === "Literal" && second.type === "Literal") {
          const indexVar =
            third?.type === "Literal" ? String(third.value) : undefined;
          pairs.push([String(first.value), String(second.value), indexVar]);
        }
      }
    }
    return pairs;
  }

  private static updateActiveIndices(
    pairs: Array<[string, string, string?]>,
    viewVariables: Record<string, unknown>
  ): void {
    computationStore.clearActiveIndices();
    pairs.forEach(([, linkedVarId, indexVar]) => {
      if (indexVar) {
        const indexValue = viewVariables[indexVar];
        if (typeof indexValue === "number") {
          computationStore.setActiveIndex(linkedVarId, indexValue);
          computationStore.addProcessedIndex(linkedVarId, indexValue);
        }
      }
    });
  }
}
