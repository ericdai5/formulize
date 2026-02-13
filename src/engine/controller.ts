import { ComputationStore } from "../store/computation";
import { VAR_SELECTORS } from "../internal/css-classes";

/**
 * Unescape a JSON-escaped string (e.g. "\\theta" -> "\theta")
 * Returns the original string if unescaping fails
 */
export const unescapeLatex = (str: string): string => {
  try {
    return JSON.parse(`"${str}"`);
  } catch {
    return str;
  }
};

/**
 * Check if an element is within a formula container with the specified ID
 */
const isInFormulaContainer = (
  element: HTMLElement,
  formulaId: string
): boolean => {
  const parent = element.closest(
    `[data-formula-id="${CSS.escape(formulaId)}"]`
  );
  return parent !== null;
};

/**
 * Apply a visual cue (pulse animation) to variables that are being updated in step mode.
 * NOTE: This function does NOT clear existing cues - call clearAllCues() first if needed.
 */
export const applyCue = (updatedVarIds: Set<string>, formulaId?: string) => {
  const interactiveElements = document.querySelectorAll(VAR_SELECTORS.ANY);
  interactiveElements.forEach((element) => {
    const htmlEl = element as HTMLElement;
    const varId = htmlEl.id;
    if (!varId) return;
    if (formulaId && !isInFormulaContainer(htmlEl, formulaId)) {
      return;
    }
    if (updatedVarIds.has(varId)) {
      htmlEl.classList.add("step-cue");
    }
  });
};

/**
 * Clear all visual cues from interactive elements
 */
export const clearAllCues = () => {
  const interactiveElements = document.querySelectorAll(VAR_SELECTORS.ALL);
  interactiveElements.forEach((element) => {
    (element as HTMLElement).classList.remove("step-cue");
  });
};

/**
 * Apply the current step's state to the computation store and UI.
 */
const applyStepState = (computationStore: ComputationStore): void => {
  const step = computationStore.currentStep;
  requestAnimationFrame(() => {
    clearAllCues();
  });
  if (!step) {
    computationStore.updateStepValues();
    return;
  }
  computationStore.updateStepValues();
  const activeVarsMap = computationStore.getActiveVariables();
  if (activeVarsMap.size > 0) {
    requestAnimationFrame(() => {
      for (const [formulaId, varIds] of activeVarsMap.entries()) {
        applyCue(varIds, formulaId || undefined);
      }
    });
  }
};

/**
 * Refresh steps by re-running the semantics function and collecting step() calls.
 */
export function refresh(computationStore?: ComputationStore): void {
  if (!computationStore) return;
  try {
    computationStore.setStepError(null);
    clearAllCues();
    const steps = computationStore.sampleSteps();
    computationStore.setSteps(steps);
    if (steps.length > 0) {
      applyStepState(computationStore);
    }
  } catch (error) {
    console.error("[refresh] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    computationStore.setStepError(errorMessage);
  }
}

/**
 * Navigate to the next step.
 */
export function nextStep(computationStore?: ComputationStore): void {
  if (!computationStore) return;
  computationStore.nextStep();
  applyStepState(computationStore);
}

/**
 * Navigate to the previous step.
 */
export function prevStep(computationStore?: ComputationStore): void {
  if (!computationStore) return;
  computationStore.prevStep();
  applyStepState(computationStore);
}

/**
 * Navigate to a specific step by index.
 */
export function goToStep(
  index: number,
  computationStore?: ComputationStore
): void {
  if (!computationStore) return;
  computationStore.goToStep(index);
  applyStepState(computationStore);
}

/**
 * Navigate to the first step.
 */
export function goToStart(computationStore?: ComputationStore): void {
  if (!computationStore) return;
  computationStore.goToStart();
  applyStepState(computationStore);
}

/**
 * Navigate to the last step.
 */
export function goToEnd(computationStore?: ComputationStore): void {
  if (!computationStore) return;
  computationStore.goToEnd();
  applyStepState(computationStore);
}
