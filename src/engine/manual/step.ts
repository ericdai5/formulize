import { ReactCodeMirrorRef } from "@uiw/react-codemirror";

import { IStep } from "../../types/step";
import { highlightCode } from "../../util/codemirror";
import { JSInterpreter, StackFrame } from "./interpreter";
import { VariableExtractor } from "./variableExtractor";

export class Step {
  static getState(
    interpreter: JSInterpreter,
    stepNumber: number,
    code: string
  ): IStep {
    const stack = interpreter.getStateStack() as StackFrame[];
    const node = stack.length ? stack[stack.length - 1].node : null;
    const variables = VariableExtractor.extractVariables(
      interpreter,
      stack,
      code
    );
    const stackTrace = this.buildStackTrace(stack);
    return {
      step: stepNumber,
      highlight: { start: node?.start || 0, end: node?.end || 0 },
      variables,
      stackTrace,
      timestamp: Date.now(),
    };
  }

  static highlight(
    codeMirrorRef: React.MutableRefObject<ReactCodeMirrorRef | null>,
    highlight: { start: number; end: number }
  ): void {
    highlightCode(codeMirrorRef, highlight.start, highlight.end);
  }

  private static buildStackTrace(stack: StackFrame[]): string[] {
    return stack.map((frame, i: number) => {
      const funcName = frame.func?.node?.id?.name
        ? ` (${frame.func.node.id.name})`
        : "";
      return `Frame ${i}: ${frame.node?.type || "Unknown"}${funcName}`;
    });
  }
}
