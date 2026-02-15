/**
 * Helper for applying scale transforms to elements outside MathJax's layout.
 * Wraps elements in a span and toggles classes to animate scale in/out
 * without causing DOM restructuring on unhover.
 */

const WRAPPER_CLASS = "var-scale-wrapper";
const ACTIVE_CLASS = "active";
const SCALE_OUT_CLASS = "scale-out";

/**
 * Pre-wraps all variable elements in a container after MathJax renders.
 * Call this after formula rendering to set up wrappers before any hover occurs.
 * @param draggingVarIds - If provided, re-apply hover state to these variables (immediate, no animation)
 */
export const setupScaleWrappers = (
  container: HTMLElement,
  selector: string,
  draggingVarIds?: string[]
): void => {
  const elements = container.querySelectorAll(selector);
  elements.forEach((element) => {
    // Skip if already wrapped to prevent nested wrappers on repeated calls
    if (element.parentElement?.classList.contains(WRAPPER_CLASS)) {
      return;
    }
    const wrapper = document.createElement("span");
    wrapper.className = WRAPPER_CLASS;
    element.parentNode?.insertBefore(wrapper, element);
    wrapper.appendChild(element);
  });

  // Re-apply hover state after re-render for currently dragging variables
  if (draggingVarIds && draggingVarIds.length > 0) {
    for (const varId of draggingVarIds) {
      const draggingElements = container.querySelectorAll(
        `#${CSS.escape(varId)}`
      );
      draggingElements.forEach((element) => {
        const htmlEl = element as HTMLElement;
        htmlEl.classList.add("hovered");
        activateScaleWrapper(htmlEl, true); // immediate=true, no animation
      });
    }
  }
};

/**
 * Activates the scale-in animation on an element's wrapper.
 * Assumes wrapper was set up by setupScaleWrappers.
 * @param immediate - If true, apply scale immediately without animation (for re-renders during drag)
 */
export const activateScaleWrapper = (
  element: HTMLElement,
  immediate = false
): void => {
  const wrapper = element.parentElement;
  if (wrapper?.classList.contains(WRAPPER_CLASS)) {
    wrapper.classList.remove(SCALE_OUT_CLASS);
    if (immediate) {
      // Apply scale directly without animation
      (wrapper as HTMLElement).style.transform = "scale(1.1)";
      (wrapper as HTMLElement).style.animation = "none";
    } else {
      // Clear any inline styles and use CSS animation
      (wrapper as HTMLElement).style.transform = "";
      (wrapper as HTMLElement).style.animation = "";
      wrapper.classList.add(ACTIVE_CLASS);
    }
  }
};

/**
 * Deactivates the scale wrapper by triggering scale-out animation.
 */
export const deactivateScaleWrapper = (element: HTMLElement): void => {
  const wrapper = element.parentElement;
  if (wrapper?.classList.contains(WRAPPER_CLASS)) {
    // Clear any inline styles from immediate activation
    (wrapper as HTMLElement).style.transform = "";
    (wrapper as HTMLElement).style.animation = "";
    wrapper.classList.remove(ACTIVE_CLASS);
    wrapper.classList.add(SCALE_OUT_CLASS);
  }
};

/**
 * Updates hover state for variable elements in a container.
 * Removes hover from elements no longer highlighted and adds to newly highlighted ones.
 * @param useScaleWrappers - If true, also activates/deactivates scale wrappers (for formula canvas)
 */
export function updateVariableHoverState(
  container: HTMLElement,
  highlightedVarIds: string[],
  useScaleWrappers = false
): void {
  const highlightedSet = new Set(highlightedVarIds);

  // Remove hover from elements that are no longer highlighted (only within scale wrappers)
  const currentlyHovered = container.querySelectorAll(".var-scale-wrapper .hovered");
  currentlyHovered.forEach((element) => {
    const htmlEl = element as HTMLElement;
    if (!highlightedSet.has(htmlEl.id)) {
      htmlEl.classList.remove("hovered");
      if (useScaleWrappers) {
        deactivateScaleWrapper(htmlEl);
      }
    }
  });

  // Add hover to highlighted elements
  for (const varId of highlightedVarIds) {
    const elements = container.querySelectorAll(`#${CSS.escape(varId)}`);
    elements.forEach((element) => {
      const htmlEl = element as HTMLElement;
      const alreadyHovered = htmlEl.classList.contains("hovered");
      if (!alreadyHovered) {
        htmlEl.classList.add("hovered");
        if (useScaleWrappers) {
          activateScaleWrapper(htmlEl);
        }
      }
    });
  }
}
