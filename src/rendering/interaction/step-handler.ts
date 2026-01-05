import {
  extractArrayAccess,
  extractIdentifiers,
  extractLine,
  findMemberOfVariable,
} from "../../engine/manual/extract";
import { ComputationStore } from "../../store/computation";
import { ExecutionStore } from "../../store/execution";
import { VAR_SELECTORS } from "../css-classes";

/**
 * Function to update all variables based on the current step state.
 * @param variables - All variables extracted from interpreter state (source of truth)
 * @param linkageMap - Map of local variable names to variable IDs (can be string or string[] for multi-linkages)
 * @param currentLineCode - The current line of code being executed
 * @param computationStore - Optional scoped computation store (defaults to global)
 * @param executionStore - Optional scoped execution store (defaults to global)
 * @returns Set of variable IDs that should be active/highlighted (only those on current line)
 */
export const updateAllVariables = (
  variables: Record<string, unknown>,
  linkageMap: Record<string, string | string[]>,
  currentLineCode: string,
  computationStore: ComputationStore,
  executionStore: ExecutionStore
): Set<string> => {
  const line = extractLine(currentLineCode);
  const identifiers = extractIdentifiers(line);
  const arrayAccesses = extractArrayAccess(line);

  updateSingleLinkageValues(
    variables,
    linkageMap,
    computationStore,
    executionStore
  );
  return determineActiveVariables(
    variables,
    linkageMap,
    identifiers,
    arrayAccesses,
    computationStore
  );
};

const updateSingleLinkageValues = (
  variables: Record<string, unknown>,
  linkageMap: Record<string, string | string[]>,
  computationStore: ComputationStore,
  executionStore: ExecutionStore
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
  arrayAccesses: Set<string>,
  computationStore: ComputationStore
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
          const memberVar = findMemberOfVariable(iterVarId, computationStore);
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
  // Use element ID directly instead of looking up in computationStore
  // This works in multi-provider scenarios where the global store may not have the variables
  interactiveElements.forEach((element) => {
    const htmlEl = element as HTMLElement;
    const varId = htmlEl.id;
    if (!varId) return;
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
