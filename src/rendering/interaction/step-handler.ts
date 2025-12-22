import {
  extractArrayAccess,
  extractIdentifiers,
  extractLine,
  findMemberOfVariable,
} from "../../engine/manual/extract";
import { findVariableByElement } from "../../parse/variable";
import { computationStore } from "../../store/computation";
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
 * Function to update all variables based on the current line being executed
 * Only activates variables that are REFERENCED on the current line
 *
 * @param variables - All variables extracted from interpreter state
 * @param linkageMap - Map of local variable names to variable IDs (can be string or string[] for multi-linkages)
 * @param currentLineCode - The current line of code being executed
 * @returns Set of variable IDs that should be active/highlighted
 */
export const updateAllVariables = (
  variables: Record<string, unknown>,
  linkageMap: Record<string, string | string[]>,
  currentLineCode: string
): Set<string> => {
  const updatedVarIds = new Set<string>();
  const line = extractLine(currentLineCode);
  const identifiers = extractIdentifiers(line);
  const arrayAccesses = extractArrayAccess(line);
  Object.entries(linkageMap).forEach(([varName, varId]) => {
    // Skip if this variable is not referenced on the current line
    if (!identifiers.has(varName)) {
      return;
    }
    const value = variables[varName];
    if (value === undefined) return;
    // Handle both single varId and array of varIds (multi-linkage)
    const varIds = Array.isArray(varId) ? varId : [varId];
    const isMultiLinkage = Array.isArray(varId) && varId.length > 1;
    // Handle array values (e.g., xValues = vars.X where X is an array)
    if (Array.isArray(value)) {
      for (const varId of varIds) {
        // Check if this array is being accessed with an index (e.g., xValues[i])
        if (arrayAccesses.has(varName)) {
          const memberVar = findMemberOfVariable(varId);
          if (memberVar) {
            updatedVarIds.add(memberVar);
            continue;
          }
          updatedVarIds.add(varId);
          continue;
        }
        // If not indexed, activate the array itself
        updatedVarIds.add(varId);
      }
      return;
    }

    // Handle numeric values
    if (typeof value === "number") {
      for (const varId of varIds) {
        if (isMultiLinkage) {
          // For multi-linkage (expression variables like currExpected = xi * probability):
          // Add all linked variables to activeVariables for highlighting
          updatedVarIds.add(varId);

          // Also find and update the source local variables that link to this varId
          // e.g., if currExpected links to ['x', 'P(x)'], find xi→x and probability→P(x)
          for (const [sourceVar, sourceVarId] of Object.entries(linkageMap)) {
            // Skip multi-linkages and the current variable
            if (Array.isArray(sourceVarId) || sourceVar === varName) continue;
            // If this source variable links to the same varId
            if (sourceVarId === varId) {
              const sourceValue = variables[sourceVar];
              if (typeof sourceValue === "number") {
                computationStore.setValueInStepMode(varId, sourceValue);
              }
            }
          }
        } else {
          // For single linkage: update value and add to active
          computationStore.setValueInStepMode(varId, value);
          updatedVarIds.add(varId);
        }
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
    VAR_SELECTORS.INPUT_AND_COMPUTED
  );
  interactiveElements.forEach((element) => {
    const variables = findVariableByElement(element as HTMLElement);
    if (!variables) return;
    const { varId } = variables;
    const target = element as HTMLElement;
    // Always remove the step-cue class first to clear previous styling
    target.classList.remove("step-cue");
    // Only add step-cue to variables that were actually updated in this step
    if (updatedVarIds.has(varId)) {
      target.classList.add("step-cue");
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
