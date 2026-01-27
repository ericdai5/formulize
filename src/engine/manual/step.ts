import { ReactCodeMirrorRef } from "@uiw/react-codemirror";

import { IObject, IStep } from "../../types/step";
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

  /**
   * Process object configs and add items to history based on viewId matching.
   * Also handles persistence by copying persistent items to subsequent steps.
   *
   * @param history - The execution history array
   * @param objectConfigs - Array of object configurations
   */
  static processObjects(history: IStep[], objects: IObject[]): void {
    if (!objects || objects.length === 0) return;
    // First pass: add items to steps where viewId (and optionally index) matches
    for (const object of objects) {
      for (let stepIdx = 0; stepIdx < history.length; stepIdx++) {
        const step = history[stepIdx];
        const viewId = step.view?.id;
        if (!viewId) continue;
        // Check each item config for matching viewId and index
        for (const itemConfig of object.items) {
          if (itemConfig.viewId !== viewId) continue;
          // If index is specified, only match that specific step
          if (itemConfig.index !== undefined && itemConfig.index !== stepIdx) continue;
          // Create the extension item with the data
          const item: IObject["items"][number] = {
            viewId: itemConfig.viewId,
            index: itemConfig.index,
            persistence: itemConfig.persistence,
            data: itemConfig.data,
          };
          // Add to step's extensions
          if (!step.extensions) step.extensions = {};
          if (!step.extensions[object.key]) step.extensions[object.key] = [];
          step.extensions[object.key].push(item);
        }
      }
    }
    // Second pass: propagate persistent items through history
    this.propagatePersistentExtensions(history);
  }

  /**
   * Propagate all persistent extensions through history.
   * Iterates through all extension keys and carries forward items with `persistence: true`.
   * This is called automatically by processExtensions but can also be called separately.
   *
   * @param history - The execution history array
   */
  static propagatePersistentExtensions(history: IStep[]): void {
    // Collect all extension keys from all steps
    const allKeys = new Set<string>();
    for (const step of history) {
      if (step.extensions) {
        for (const key of Object.keys(step.extensions)) {
          allKeys.add(key);
        }
      }
    }

    // For each extension key, propagate persistent items through history
    for (const extensionKey of allKeys) {
      for (let i = 1; i < history.length; i++) {
        const prevStep = history[i - 1];
        const currentStep = history[i];

        const prevItems = prevStep.extensions?.[extensionKey];
        if (!Array.isArray(prevItems)) continue;

        // Filter for persistent items from previous step
        const persistentItems = prevItems.filter(
          (item) => item.persistence === true
        );

        if (persistentItems.length === 0) continue;

        if (!currentStep.extensions) currentStep.extensions = {};

        const currentItems = currentStep.extensions[extensionKey];
        if (Array.isArray(currentItems)) {
          // Prepend persistent items to current items (avoid duplicates)
          const existingIds = new Set(
            currentItems.map(
              (item) => `${item.viewId}-${JSON.stringify(item.data)}`
            )
          );
          const newPersistent = persistentItems.filter(
            (item) =>
              !existingIds.has(`${item.viewId}-${JSON.stringify(item.data)}`)
          );
          currentStep.extensions[extensionKey] = [
            ...newPersistent,
            ...currentItems,
          ];
        } else {
          // No current items, just carry forward persistent ones
          currentStep.extensions[extensionKey] = [...persistentItems];
        }
      }
    }
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
