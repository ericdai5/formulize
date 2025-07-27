import { computationStore } from "../../store/computation";
import { getVariable } from "../../util/computation-helpers";
import { findVariableByElement } from "../../variableProcessing";

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
 * Function to update variables using view variable values from interpreter.tsx
 * @param viewVariables - The view variables already extracted by interpreter.tsx
 * @param pairs - The pairs from view() call: [localVarName, linkedVarId, indexVar?]
 * @returns Set of variable IDs that were updated
 */
export const updateVariables = (
  viewVariables: Record<string, unknown>,
  pairs: Array<[string, string, string?]>
): Set<string> => {
  const updatedVarIds = new Set<string>();
  pairs.forEach(([name, varId]) => {
    const value = viewVariables[name];
    if (value !== undefined && typeof value === "number") {
      computationStore.setValueInStepMode(varId, value);
      updatedVarIds.add(varId);
    }
  });
  return updatedVarIds;
};

/**
 * Function to update all variables using all extracted variables
 * @param variables - All variables extracted from interpreter state
 * @param linkageMap - Map of local variable names to variable IDs
 * @returns Set of variable IDs that were updated
 */
export const updateAllVariables = (
  variables: Record<string, unknown>,
  linkageMap: Record<string, string>
): Set<string> => {
  const updatedVarIds = new Set<string>();
  Object.entries(linkageMap).forEach(([localVarName, varId]) => {
    const value = variables[localVarName];
    if (value !== undefined && typeof value === "number") {
      const variable = computationStore.variables.get(varId);
      const currentValue = variable?.value;
      if (currentValue !== value) {
        computationStore.setValueInStepMode(varId, value);
        updatedVarIds.add(varId);
      }
    }
  });
  return updatedVarIds;
};

/**
 * Apply a visual cue styling to variables that are being updated in step mode
 * @param updatedVarIds - Set of variable IDs that were updated
 */
export const applyCue = (updatedVarIds: Set<string>) => {
  const interactiveElements = document.querySelectorAll(
    ".interactive-var-dropdown, .interactive-var-slider, .interactive-var-dependent"
  );
  interactiveElements.forEach((element) => {
    const variables = findVariableByElement(element as HTMLElement);
    if (!variables) return;
    const { varId } = variables;
    const target = element as HTMLElement;
    target.classList.remove("step-cue");
    if (updatedVarIds.has(varId)) {
      target.classList.add("step-cue");
    }
  });
};
