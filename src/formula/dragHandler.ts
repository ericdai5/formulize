import { computationStore } from "../api/computation";
import { getInputVariableState } from "../api/variableProcessing";

/**
 * Helper function to decode a safe CSS ID back to the original variable name
 */
const decodeCssId = (cssId: string): string | null => {
  if (!cssId.startsWith("var-")) return null;

  const encoded = cssId.slice(4); // Remove 'var-' prefix

  // For simple variables like 'x', 'y', 'z' - no decoding needed
  if (encoded.length === 1 && /^[a-zA-Z]$/.test(encoded)) {
    return encoded;
  }

  // For complex variables - decode special characters back to original form
  const decoded = encoded.replace(/_(\d+)_/g, (_match, charCode) => {
    return String.fromCharCode(parseInt(charCode));
  });

  return decoded;
};

/**
 * Helper function to find a variable by matching either the original symbol or encoded CSS ID
 */
const findVariableByElement = (
  element: HTMLElement
): { varId: string; symbol: string } | null => {
  const cssId = element.id;

  // First try to decode the CSS ID to get the original symbol
  const decodedSymbol = decodeCssId(cssId);
  if (decodedSymbol) {
    const originalVarId = `var-${decodedSymbol}`;
    if (computationStore.variables.has(originalVarId)) {
      return { varId: originalVarId, symbol: decodedSymbol };
    }
  }

  // Fallback: try to match against all variables in the store
  for (const [varId, variable] of computationStore.variables.entries()) {
    // Create the same safe CSS ID for this variable using the same logic as processVariableToLatex
    let safeCssId: string;
    if (variable.symbol.length === 1 && /^[a-zA-Z]$/.test(variable.symbol)) {
      // Simple single-letter variable - no encoding needed
      safeCssId = `var-${variable.symbol}`;
    } else {
      // Complex variable - encode special characters
      safeCssId = `var-${variable.symbol}`.replace(
        /[^a-zA-Z0-9_-]/g,
        (char) => {
          return `_${char.charCodeAt(0)}_`;
        }
      );
    }

    if (safeCssId === cssId) {
      return { varId, symbol: variable.symbol };
    }
  }

  // console.warn(`Could not find variable for CSS ID: ${cssId}`);
  // console.warn(
  //   "Available variables:",
  //   Array.from(computationStore.variables.keys())
  // );
  return null;
};

export const dragHandler = (
  container: HTMLElement,
  variableRanges: Record<string, [number, number]> = {}
) => {
  if (!container) return;

  const slidableElements = container.querySelectorAll(
    ".interactive-var-slidable"
  );

  slidableElements.forEach((element) => {
    let isDragging = false;
    let startY = 0;

    // Find the variable using the improved matching function
    const variableMatch = findVariableByElement(element as HTMLElement);
    if (!variableMatch) {
      // console.warn("❌ Could not find variable for element:", element.id);
      return;
    }

    const { varId } = variableMatch;
    const variableState = getInputVariableState(varId, variableRanges);

    if (!variableState) {
      // console.warn("❌ Could not get variable state for:", varId);
      return;
    }

    const { stepSize, minValue, maxValue } = variableState;
    let startValue = (minValue + maxValue) / 2;

    const handleMouseMove = async (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startY - e.clientY;
      const newValue = startValue + deltaY * stepSize;
      computationStore.setValue(
        varId,
        Math.max(minValue, Math.min(maxValue, newValue))
      );
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    element.addEventListener("mousedown", (e: Event) => {
      if (!(e instanceof MouseEvent)) return;
      isDragging = true;
      startY = e.clientY;
      startValue = parseFloat(element.textContent || "0");
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      e.preventDefault();
    });
  });
};
