import { updateStepModeVariables } from "../../../formula/stepHandler";
import { IEnvironment } from "../../../types/environment";
import { extractVariableNames } from "../../../util/acorn";
import { highlightCode } from "../../../util/codemirror";
import { computationStore } from "../../computation";
import {
  JSInterpreter,
  StackFrame,
  collectVariablesFromStack,
  initializeInterpreter,
  isAtView,
} from "./interpreter";

export interface DebugState {
  step: number;
  highlight: { start: number; end: number };
  variables: Record<string, unknown>;
  stackTrace: string[];
  timestamp: number;
  viewVariables: Record<string, unknown>;
}

export interface ExecutionContext {
  code: string;
  environment: IEnvironment | null;
  interpreter: JSInterpreter | null;
  history: DebugState[];
  isComplete: boolean;
  isSteppingToView: boolean;
  isSteppingToIndex: boolean;
  targetIndex: { variableId: string; index: number } | null;
  autoPlayIntervalRef: React.MutableRefObject<number | null>;
  codeMirrorRef: React.MutableRefObject<any>;

  // State setters
  setInterpreter: (interpreter: JSInterpreter | null) => void;
  setHistory: React.Dispatch<React.SetStateAction<DebugState[]>>;
  setIsComplete: (complete: boolean) => void;
  setError: (error: string | null) => void;
  setIsRunning: (running: boolean) => void;
  setIsSteppingToView: (stepping: boolean) => void;
  setIsSteppingToIndex: (stepping: boolean) => void;
  setTargetIndex: (
    target: { variableId: string; index: number } | null
  ) => void;
}

export function getCurrentState(
  interpreter: JSInterpreter,
  stepNumber: number,
  code: string
): DebugState {
  const stack = interpreter.getStateStack();
  const node = stack.length
    ? (stack[stack.length - 1] as StackFrame).node
    : null;
  const variables: Record<string, unknown> = {};

  try {
    // Extract variable names from code
    const varNames = extractVariableNames(code);
    // Use the refactored variable extraction
    const extractedVariables = collectVariablesFromStack(
      interpreter,
      stack,
      varNames
    );
    Object.assign(variables, extractedVariables);
    // Capture the interpreter's current value (result of last statement)
    if (interpreter.value !== undefined) {
      try {
        variables["Interpreter Value"] = interpreter.pseudoToNative
          ? interpreter.pseudoToNative(interpreter.value)
          : interpreter.value;
      } catch {
        variables["Interpreter Value"] = interpreter.value;
      }
    }
    // Add debugging info about execution state
    variables["Current Node Type"] = node?.type || "Unknown";
    variables["Stack Depth"] = stack?.length || 0;
    variables["Declared Variables"] = varNames;
    // Add more detailed node information
    if (node) {
      variables["Node Info"] = {
        type: node.type,
        start: node.start,
        end: node.end,
        ...(node.type === "Identifier" && { name: node.name }),
        ...(node.type === "VariableDeclaration" && {
          declarations: node.declarations
            ?.map((d: { id?: { name: string } }) => d.id?.name)
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
      const currentState = stack[stack.length - 1] as StackFrame;
      if (currentState.scope) {
        variables["Current Scope Type"] = currentState.scope.constructor.name;
      }
      if (currentState.func && currentState.func.node) {
        variables["Current Function"] =
          currentState.func.node.id?.name || "Anonymous";
      }
    }
  } catch (err) {
    console.warn("Error extracting variables:", err);
    variables["[Error]"] = `Could not extract variables: ${err}`;
  }

  // Check if we're currently at a view() breakpoint
  const atView = isAtView(interpreter);
  let viewVariables: Record<string, unknown> = {};

  if (atView) {
    // If we're at a view() call, extract fresh params from the AST
    // This ensures we show the params for the CURRENT view(), not the previous one
    const currentFrame = stack[stack.length - 1] as StackFrame;
    if (
      currentFrame?.node?.callee?.name === "view" &&
      currentFrame.node.arguments?.[0]
    ) {
      const firstArg = currentFrame.node.arguments[0];
      if (firstArg.type === "ArrayExpression" && firstArg.elements) {
        try {
          const pairs: Array<[string, string, string?]> = [];
          for (const element of firstArg.elements) {
            if (
              element.type === "ArrayExpression" &&
              element.elements &&
              element.elements.length >= 2
            ) {
              const first = element.elements[0];
              const second = element.elements[1];
              const third = element.elements[2];
              if (first.type === "Literal" && second.type === "Literal") {
                const indexVar =
                  third?.type === "Literal" ? String(third.value) : undefined;
                pairs.push([
                  String(first.value),
                  String(second.value),
                  indexVar,
                ]);
              }
            }
          }
          if (pairs.length > 0) {
            // Extract the view variables (including index variables)
            const viewVarNames = pairs.flatMap(([varName, , indexVar]) =>
              indexVar ? [varName, indexVar] : [varName]
            );
            viewVariables = collectVariablesFromStack(
              interpreter,
              stack,
              viewVarNames
            );

            // Update step mode variables in Formulize
            updateStepModeVariables(viewVariables, pairs);

            // Set active indices in computation store using linked variable IDs
            computationStore.clearActiveIndices();
            pairs.forEach(([, linkedVarId, indexVar]) => {
              // If there's an index variable, use its value for index-based tracking
              if (indexVar) {
                const indexValue = viewVariables[indexVar];
                if (typeof indexValue === "number") {
                  computationStore.setActiveIndex(linkedVarId, indexValue);
                  computationStore.addProcessedIndex(linkedVarId, indexValue);
                }
              }
            });
          }
        } catch (err) {
          console.warn("Error extracting view parameters:", err);
          viewVariables["[View Error]"] =
            `Could not extract view variables: ${err}`;
        }
      }
    }
  } else {
    // Clear active indices when not at a view
    computationStore.clearActiveIndices();
  }

  return {
    step: stepNumber,
    highlight: { start: node?.start || 0, end: node?.end || 0 },
    variables,
    stackTrace: stack.map((s, i: number) => {
      const frame = s as StackFrame;
      return `Frame ${i}: ${frame.node?.type || "Unknown"}${frame.func?.node?.id?.name ? ` (${frame.func.node.id.name})` : ""}`;
    }),
    timestamp: Date.now(),
    viewVariables,
  };
}

function stepPastCurrentView(context: ExecutionContext): {
  success: boolean;
  stepsCount: number;
} {
  if (!context.interpreter || !isAtView(context.interpreter)) {
    return { success: true, stepsCount: 0 };
  }

  let stepsCount = 0;
  const maxSteps = 100000;
  let stillAtSameView = true;

  while (stillAtSameView && stepsCount < maxSteps) {
    const canContinue = context.interpreter.step();
    stepsCount++;

    const newState = getCurrentState(
      context.interpreter,
      context.history.length,
      context.code
    );
    context.setHistory((prev) => [...prev, newState]);
    highlightCode(
      context.codeMirrorRef,
      newState.highlight.start,
      newState.highlight.end
    );

    if (!canContinue) {
      context.setIsComplete(true);
      return { success: false, stepsCount };
    }

    stillAtSameView = isAtView(context.interpreter);
  }

  if (stepsCount >= maxSteps) {
    context.setError(
      "Maximum steps reached while trying to step past view() breakpoint"
    );
    return { success: false, stepsCount };
  }

  return { success: true, stepsCount };
}

export function refresh(context: ExecutionContext): void {
  context.setInterpreter(null);
  context.setHistory([]);
  context.setIsComplete(false);
  context.setError(null);
  context.setIsRunning(false);
  context.setIsSteppingToView(false);
  context.setIsSteppingToIndex(false);
  context.setTargetIndex(null);

  // Clear processed indices when refreshing
  computationStore.clearProcessedIndices();

  if (context.autoPlayIntervalRef.current) {
    clearInterval(context.autoPlayIntervalRef.current);
    context.autoPlayIntervalRef.current = null;
  }

  if (context.codeMirrorRef.current) {
    const view = context.codeMirrorRef.current.view;
    if (view) {
      view.dispatch({
        selection: { anchor: 0, head: 0 },
        scrollIntoView: true,
      });
    }
  }

  // Then initialize if we have code
  if (!context.code.trim()) {
    context.setError("No code to debug");
    return;
  }

  const newInterpreter = initializeInterpreter(
    context.code,
    context.environment,
    context.setError
  );
  if (!newInterpreter) return;

  context.setInterpreter(newInterpreter);

  // Add initial state
  const initialState = getCurrentState(newInterpreter, 0, context.code);
  context.setHistory([initialState]);
  highlightCode(
    context.codeMirrorRef,
    initialState.highlight.start,
    initialState.highlight.end
  );
}

export function stepForward(context: ExecutionContext): void {
  if (!context.interpreter || context.isComplete) return;

  try {
    const canContinue = context.interpreter.step();
    const newState = getCurrentState(
      context.interpreter,
      context.history.length,
      context.code
    );

    context.setHistory((prev) => [...prev, newState]);
    highlightCode(
      context.codeMirrorRef,
      newState.highlight.start,
      newState.highlight.end
    );

    if (!canContinue) {
      context.setIsComplete(true);
      context.setIsRunning(false);
      context.setIsSteppingToView(false);
      context.setIsSteppingToIndex(false);
      if (context.autoPlayIntervalRef.current) {
        clearInterval(context.autoPlayIntervalRef.current);
        context.autoPlayIntervalRef.current = null;
      }
    }

    // Check if we've hit a view() breakpoint while stepping to breakpoint
    if (context.isSteppingToView && isAtView(context.interpreter)) {
      context.setIsSteppingToView(false);
    }
  } catch (err) {
    context.setError(`Execution error: ${err}`);
    context.setIsRunning(false);
    context.setIsSteppingToView(false);
    context.setIsSteppingToIndex(false);
    if (context.autoPlayIntervalRef.current) {
      clearInterval(context.autoPlayIntervalRef.current);
      context.autoPlayIntervalRef.current = null;
    }
  }
}

export function stepToIndex(
  context: ExecutionContext,
  variableId: string,
  targetIndex: number
): void {
  if (!context.interpreter || context.isComplete) {
    return;
  }

  context.setIsSteppingToIndex(true);
  context.setTargetIndex({ variableId, index: targetIndex });

  console.log('stepToIndex: processedIndexes', Array.from(computationStore.processedIndices.entries()));

  try {
    const maxIterations = 1000; // Prevent infinite loops
    let iterations = 0;

    while (iterations < maxIterations) {
      // Check if we're already at the target index
      if (isAtView(context.interpreter)) {
        const currentActiveIndex =
          computationStore.activeIndices.get(variableId);
        if (
          currentActiveIndex !== undefined &&
          currentActiveIndex === targetIndex
        ) {
          context.setIsSteppingToIndex(false);
          context.setTargetIndex(null);
          return;
        }
      }

      // Step to next view and check again
      stepToView(context);

      if (context.isComplete) {
        context.setIsSteppingToIndex(false);
        context.setTargetIndex(null);
        return;
      }

      iterations++;
    }

    context.setError(
      `Maximum iterations reached while looking for ${variableId} at index ${targetIndex}`
    );
    context.setIsSteppingToIndex(false);
    context.setTargetIndex(null);
  } catch (err) {
    context.setError(`Execution error: ${err}`);
    context.setIsSteppingToIndex(false);
    context.setTargetIndex(null);
  }
}

export function stepToView(context: ExecutionContext): void {
  if (!context.interpreter || context.isComplete) {
    return;
  }

  context.setIsSteppingToView(true);

  try {
    const maxSteps = 100000;
    let stepsCount = 0;

    // Step past current view if we're at one
    const stepPastResult = stepPastCurrentView(context);
    if (!stepPastResult.success) {
      context.setIsSteppingToView(false);
      return;
    }
    stepsCount += stepPastResult.stepsCount;

    // Step until we hit the next view() breakpoint
    let foundNextView = false;

    while (!foundNextView && stepsCount < maxSteps) {
      const canContinue = context.interpreter.step();
      stepsCount++;

      const state = getCurrentState(
        context.interpreter,
        context.history.length,
        context.code
      );
      context.setHistory((prev) => [...prev, state]);
      highlightCode(
        context.codeMirrorRef,
        state.highlight.start,
        state.highlight.end
      );

      if (!canContinue) {
        context.setIsComplete(true);
        context.setIsSteppingToView(false);
        return;
      }

      if (isAtView(context.interpreter)) {
        foundNextView = true;
        context.setIsSteppingToView(false);
        return;
      }
    }

    if (stepsCount >= maxSteps) {
      context.setError("Maximum steps reached while looking for next View");
      context.setIsSteppingToView(false);
      return;
    }
  } catch (err) {
    context.setError(`Execution error: ${err}`);
    context.setIsSteppingToView(false);
  }
}

export function stepBackward(context: ExecutionContext): void {
  if (context.history.length <= 1) return;
  const prevState = context.history[context.history.length - 2];
  highlightCode(
    context.codeMirrorRef,
    prevState.highlight.start,
    prevState.highlight.end
  );
}
