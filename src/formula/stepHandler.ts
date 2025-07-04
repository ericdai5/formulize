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
 * @param pairs - The pairs from view() call: [localVarName, linkedVarId, indexVar?]
 */
export const updateStepModeVariables = (
  viewVariables: Record<string, unknown>,
  pairs: Array<[string, string, string?]>
) => {
  const updatedVarIds = new Set<string>();
  pairs.forEach(([localVarName, linkedVarId]) => {
    const value = viewVariables[localVarName];
    if (value !== undefined && typeof value === "number") {
      computationStore.setValueInStepMode(linkedVarId, value);
      updatedVarIds.add(linkedVarId);
    }
  });
  // Apply updated styling to variables that were changed
  applyUpdatedVariableStyles(updatedVarIds);
};

/**
 * Apply visual styling to variables that are being updated in step mode
 * @param updatedVarIds - Set of variable IDs that were updated
 */
export const applyUpdatedVariableStyles = (updatedVarIds: Set<string>) => {
  const interactiveElements = document.querySelectorAll(
    ".interactive-var-dropdown, .interactive-var-slider, .interactive-var-dependent"
  );

  interactiveElements.forEach((element) => {
    const variableMatch = findVariableByElement(element as HTMLElement);
    if (!variableMatch) return;
    const { varId } = variableMatch;
    const htmlElement = element as HTMLElement;
    // Remove existing update styling
    htmlElement.classList.remove("step-mode-updated");
    // Add updated styling if this variable was updated
    if (updatedVarIds.has(varId)) {
      htmlElement.classList.add("step-mode-updated");
      // Remove the updated styling after animation completes
      setTimeout(() => {
        htmlElement.classList.remove("step-mode-updated");
      }, 1000);
    }
  });
};
