import { computationStore } from "../api/computation";
import { findVariableByElement } from "../api/variableProcessing";
import { getVariable } from "../util/computation-helpers";

export const stepHandler = (container: HTMLElement) => {
  if (!container) return;
  const interactiveElements = container.querySelectorAll(
    ".interactive-var-dropdown, .interactive-var-slider, .interactive-var-dependent"
  );

  interactiveElements.forEach((element) => {
    // Find the variable using the improved matching function
    const variableMatch = findVariableByElement(element as HTMLElement);
    if (!variableMatch) {
      return;
    }
    const { varId } = variableMatch;
    const variable = getVariable(varId);
    if (!variable) {
      return;
    }
    // In step mode, elements should be non-interactive
    // Remove any existing event listeners by cloning the element
    const newElement = element.cloneNode(true) as HTMLElement;
    element.parentNode?.replaceChild(newElement, element);
    // Add a visual indicator that this is in step mode
    newElement.classList.add("step-mode");
    newElement.style.cursor = "default";
    // Add tooltip showing step mode
    newElement.title = `${variable.label || varId} (Step Mode)`;
  });
};

/**
 * Simple function to update step mode variables using view data from interpreter.tsx
 * @param viewVariables - The view variables already extracted by interpreter.tsx
 * @param pairs - The pairs from view() call: [localVarName, linkedVarId]
 */
export const updateStepModeVariables = (
  viewVariables: Record<string, unknown>,
  pairs: Array<[string, string]>
) => {
  pairs.forEach(([localVarName, linkedVarId]) => {
    const value = viewVariables[localVarName];
    if (value !== undefined && typeof value === "number") {
      computationStore.setValueInStepMode(linkedVarId, value);
    }
  });
};
