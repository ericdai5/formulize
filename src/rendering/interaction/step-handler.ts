import {
  extractArrayAccess,
  extractIdentifiers,
  extractLine,
  findMemberOfVariable,
} from "../../engine/manual/extract";
import { findVariableByElement } from "../../parse/variable";
import { computationStore } from "../../store/computation";
import { executionStore } from "../../store/execution";
import { getVariable } from "../../util/computation-helpers";
import { VAR_SELECTORS } from "../css-classes";

export const stepHandler = (container: HTMLElement) => {
  if (!container) return;
  const interactiveElements = container.querySelectorAll(
    VAR_SELECTORS.INPUT_AND_COMPUTED
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
    newElement.title = `${variable.name || varId} (Step Mode)`;
  });
};

/**
 * Function to update all variables based on the current step state.
 * @param variables - All variables extracted from interpreter state (source of truth)
 * @param linkageMap - Map of local variable names to variable IDs (can be string or string[] for multi-linkages)
 * @param currentLineCode - The current line of code being executed
 * @returns Set of variable IDs that should be active/highlighted (only those on current line)
 */
export const updateAllVariables = (
  variables: Record<string, unknown>,
  linkageMap: Record<string, string | string[]>,
  currentLineCode: string
): Set<string> => {
  const line = extractLine(currentLineCode);
  const identifiers = extractIdentifiers(line);
  const arrayAccesses = extractArrayAccess(line);
  updateSingleLinkageValues(variables, linkageMap);
  return determineActiveVariables(
    variables,
    linkageMap,
    identifiers,
    arrayAccesses
  );
};

const updateSingleLinkageValues = (
  variables: Record<string, unknown>,
  linkageMap: Record<string, string | string[]>
) => {
  Object.entries(linkageMap).forEach(([localVarName, varId]) => {
    if (Array.isArray(varId)) {
      return;
    }
    const value = variables[localVarName];
    if (value === undefined) {
      const variable = computationStore.variables.get(varId);
      if (variable?.memberOf) {
        return;
      }
      if (Array.isArray(variable?.value)) {
        return;
      }
      const firstSeenValue = executionStore.getFirstSeenValue(varId);
      if (firstSeenValue !== undefined) {
        computationStore.setValueInStepMode(varId, firstSeenValue);
      }
      return;
    }
    if (typeof value === "number") {
      computationStore.setValueInStepMode(varId, value);
    }
  });
};

const determineActiveVariables = (
  variables: Record<string, unknown>,
  linkageMap: Record<string, string | string[]>,
  identifiers: Set<string>,
  arrayAccesses: Set<string>
): Set<string> => {
  const activeVarIds = new Set<string>();
  Object.entries(linkageMap).forEach(([varName, varId]) => {
    if (!identifiers.has(varName)) {
      return;
    }
    const value = variables[varName];
    if (value === undefined) {
      return;
    }
    const varIds = Array.isArray(varId) ? varId : [varId];
    if (Array.isArray(value)) {
      for (const iterVarId of varIds) {
        if (arrayAccesses.has(varName)) {
          const memberVar = findMemberOfVariable(iterVarId);
          if (memberVar) {
            activeVarIds.add(memberVar);
            continue;
          }
          activeVarIds.add(iterVarId);
          continue;
        }
        activeVarIds.add(iterVarId);
      }
      return;
    }
    if (typeof value === "number") {
      for (const iterVarId of varIds) {
        activeVarIds.add(iterVarId);
      }
    }
  });
  return activeVarIds;
};

/**
 * Check if an element has an ancestor with the step-cue class
 */
const hasAncestorWithStepCue = (element: HTMLElement): boolean => {
  let parent = element.parentElement;
  while (parent) {
    if (parent.classList.contains("step-cue")) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
};

/**
 * Apply a visual cue styling to variables that are being updated in step mode
 * @param updatedVarIds - Set of variable IDs that were updated
 */
export const applyCue = (updatedVarIds: Set<string>) => {
  // Use ANY selector to include all variable types (input, computed, index)
  const interactiveElements = document.querySelectorAll(VAR_SELECTORS.ANY);
  // First pass: remove all step-cue classes
  interactiveElements.forEach((element) => {
    (element as HTMLElement).classList.remove("step-cue");
  });
  // Second pass: apply step-cue to matching elements
  // Skip elements whose ancestors already have step-cue (nested variables)
  interactiveElements.forEach((element) => {
    const htmlEl = element as HTMLElement;
    const variables = findVariableByElement(htmlEl);
    if (!variables) return;
    const { varId } = variables;
    // Only add step-cue to variables that were actually updated in this step
    // Skip if an ancestor already has step-cue (e.g., y inside y^{(i)} when y^{(i)} is active)
    if (updatedVarIds.has(varId) && !hasAncestorWithStepCue(htmlEl)) {
      htmlEl.classList.add("step-cue");
    }
  });
};

/**
 * Clear all visual cues from interactive elements
 * This ensures clean state when stepping between different lines
 */
export const clearAllCues = () => {
  const interactiveElements = document.querySelectorAll(
    VAR_SELECTORS.INPUT_AND_COMPUTED
  );
  interactiveElements.forEach((element) => {
    const target = element as HTMLElement;
    target.classList.remove("step-cue");
  });
};
