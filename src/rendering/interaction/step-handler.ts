import { VAR_SELECTORS } from "../css-classes";

/**
 * Check if an element is within a formula container with the specified ID
 * @param element - The element to check
 * @param formulaId - The formula ID to match
 * @returns True if the element is within the specified formula container
 */
const isInFormulaContainer = (
  element: HTMLElement,
  formulaId: string
): boolean => {
  // Look for a parent with data-formula-id attribute matching the formulaId
  const parent = element.closest(
    `[data-formula-id="${CSS.escape(formulaId)}"]`
  );
  return parent !== null;
};

/**
 * Apply a visual cue styling to variables that are being updated in step mode
 * @param updatedVarIds - Set of variable IDs that were updated
 * @param formulaId - Optional formula ID to limit cues to a specific formula
 */
export const applyCue = (updatedVarIds: Set<string>, formulaId?: string) => {
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
    // If formulaId is specified, only apply cue to elements within that formula
    if (formulaId && !isInFormulaContainer(htmlEl, formulaId)) {
      return;
    }
    // Only add step-cue to variables that were actually updated in this step
    if (updatedVarIds.has(varId)) {
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
