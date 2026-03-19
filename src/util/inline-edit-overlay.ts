/**
 * Utility for creating inline edit overlays on MathJax-rendered variables.
 * Used when a variable has input: "inline" to allow click-to-edit functionality.
 */
import { ComputationStore } from "../store/computation";
import { INPUT_VARIABLE_DEFAULT } from "../types/variable";
import { formatNumberForDisplay } from "./format-number";

interface InlineEditOptions {
  varId: string;
  element: HTMLElement;
  computationStore: ComputationStore;
  onClose?: () => void;
}

/**
 * Creates and shows an inline edit input inside the variable element.
 * The input replaces the MathJax content temporarily.
 */
export const showInlineEditOverlay = ({
  varId,
  element,
  computationStore,
  onClose,
}: InlineEditOptions): HTMLInputElement | null => {
  const variable = computationStore.variables.get(varId);
  if (!variable) {
    console.warn(`[InlineEdit] Variable not found: ${varId}`);
    return null;
  }

  const currentValue = typeof variable.value === "number" ? variable.value : 0;
  const precision = variable.precision ?? INPUT_VARIABLE_DEFAULT.PRECISION;
  const sigFigs = variable.sigFigs;
  const range = variable.range || [-Infinity, Infinity];
  const [minValue, maxValue] = range;

  // Get computed styles and dimensions from the element before modifying
  const computedStyle = window.getComputedStyle(element);
  const fontSize = computedStyle.fontSize;
  const originalWidth = element.offsetWidth;
  const originalHeight = element.offsetHeight;

  // Create the input element
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.className = "inline-edit-input";
  input.value = formatNumberForDisplay(currentValue, { precision, sigFigs });

  // Create a hidden span to measure text width
  const measureSpan = document.createElement("span");
  measureSpan.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: pre;
    font-size: ${fontSize};
    font-family: KaTeX_Main, Times New Roman, serif;
  `;
  document.body.appendChild(measureSpan);

  const measureTextWidth = (text: string): number => {
    measureSpan.textContent = text || "0";
    const rect = measureSpan.getBoundingClientRect();
    return Math.ceil(rect.width);
  };

  // Calculate initial width based on content
  const initialWidth = Math.max(
    measureTextWidth(input.value),
    originalWidth,
    30
  );

  // Ensure the element and its wrapper don't clip the input
  element.style.overflow = "visible";
  element.style.display = "inline-block";
  element.style.width = "auto";
  element.style.minWidth = "";

  // Also handle scale wrapper if present
  const scaleWrapper = element.parentElement;
  if (scaleWrapper?.classList.contains("var-scale-wrapper")) {
    scaleWrapper.style.overflow = "visible";
    scaleWrapper.style.width = "auto";
    scaleWrapper.style.minWidth = "";
  }

  // Style the input to match the MathJax element exactly
  Object.assign(input.style, {
    width: `${initialWidth}px`,
    minWidth: "10px",
    height: `${originalHeight}px`,
    fontSize: fontSize,
    fontFamily: "KaTeX_Main, Times New Roman, serif",
    textAlign: "center",
    border: "none",
    borderBottom: "1px solid #3b82f6",
    background: "transparent",
    outline: "none",
    padding: "2px 0px",
    margin: "0",
    color: "inherit",
    lineHeight: `${originalHeight}px`,
    boxSizing: "content-box",
  });

  // Mark variable as being edited (prevents formula re-render)
  computationStore.setVariableEditing(varId, true);

  // Clear the element content and insert the input
  element.innerHTML = "";
  element.appendChild(input);

  // Focus and select the content
  input.focus();
  input.select();

  // Track if we've already cleaned up
  let isClosed = false;

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    // Remove the measure span
    if (measureSpan.parentNode) {
      measureSpan.parentNode.removeChild(measureSpan);
    }
    // Clear editing state - this will trigger formula re-render
    computationStore.setVariableEditing(varId, false);
    onClose?.();
  };

  const commitValue = () => {
    const newValue = parseFloat(input.value);
    if (!isNaN(newValue)) {
      const clampedValue = Math.max(minValue, Math.min(maxValue, newValue));
      computationStore.setValue(varId, clampedValue);
    }
  };

  // Auto-resize input and update value as user types
  input.addEventListener("input", () => {
    // Resize input based on content
    const newWidth = Math.max(measureTextWidth(input.value), 30);
    input.style.width = `${newWidth}px`;

    // Update value in real-time for live feedback (no clamping during typing)
    // Clamping only happens on commit (Enter/blur)
    const newValue = parseFloat(input.value);
    if (!isNaN(newValue)) {
      computationStore.setValue(varId, newValue);
    }
  });

  // Handle blur - commit and close
  input.addEventListener("blur", () => {
    commitValue();
    cleanup();
  });

  // Handle keyboard events
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      commitValue();
      cleanup();
      e.preventDefault();
    } else if (e.key === "Escape") {
      // Revert to original value
      computationStore.setValue(varId, currentValue);
      cleanup();
      e.preventDefault();
    } else if (e.key === "Tab") {
      commitValue();
      cleanup();
      // Allow default tab behavior
    }
  });

  // Prevent clicks from propagating
  input.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  return input;
};

/**
 * Attaches inline edit click handler to an element.
 * Returns a cleanup function to remove the listener.
 */
export const attachInlineEditHandler = (
  element: HTMLElement,
  varId: string,
  computationStore: ComputationStore
): (() => void) => {
  let activeInput: HTMLInputElement | null = null;

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't open if already editing (check both local and global state)
    if (activeInput || computationStore.editingStates.get(varId)) {
      return;
    }

    activeInput = showInlineEditOverlay({
      varId,
      element,
      computationStore,
      onClose: () => {
        activeInput = null;
      },
    });
  };

  element.style.cursor = "text";
  element.style.pointerEvents = "auto";

  // Use mouseup instead of click - click might be getting intercepted
  // by React Flow or other event handlers
  element.addEventListener("mouseup", handleClick);

  // Handle mousedown to prevent drag behavior and blur when editing
  const handleMouseDown = (e: MouseEvent) => {
    // If already editing, prevent mousedown from causing blur on the input
    if (computationStore.editingStates.get(varId)) {
      e.preventDefault();
    }
    e.stopPropagation();
    e.stopImmediatePropagation();
  };
  element.addEventListener("mousedown", handleMouseDown);

  return () => {
    element.removeEventListener("mouseup", handleClick);
    element.removeEventListener("mousedown", handleMouseDown);
    if (activeInput?.parentNode) {
      activeInput.parentNode.removeChild(activeInput);
    }
  };
};
