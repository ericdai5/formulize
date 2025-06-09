import { computationStore } from "../api/computation";

export interface VariableRange {
  min: number;
  max: number;
}

const DEFAULT_MIN_VALUE = -10;
const DEFAULT_MAX_VALUE = 10;

export const dragInteractionHandlers = (
  container: HTMLElement,
  variableRanges: Record<string, VariableRange> = {}
) => {
  if (!container) return;

  const slidableElements = container.querySelectorAll(
    ".interactive-var-slidable"
  );

  slidableElements.forEach((element) => {
    let isDragging = false;
    let startY = 0;
    const SENSITIVITY = 0.5;

    // Get variable-specific range
    const varMatch = element.id.match(/^var-([a-zA-Z])$/);
    let actualMinValue = DEFAULT_MIN_VALUE;
    let actualMaxValue = DEFAULT_MAX_VALUE;

    if (varMatch) {
      const symbol = varMatch[1];
      const varId = `var-${symbol}`;

      // Check for range by varId first, then by symbol, then use defaults
      const range = variableRanges[varId] || variableRanges[symbol];
      if (range) {
        actualMinValue = range.min;
        actualMaxValue = range.max;
      }
    }

    let startValue = (actualMinValue + actualMaxValue) / 2;

    const handleMouseMove = async (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = startY - e.clientY;
      const newValue = startValue + deltaY * SENSITIVITY;
      if (!varMatch) return;
      const symbol = varMatch[1];

      const clampedValue = Math.max(
        actualMinValue,
        Math.min(actualMaxValue, newValue)
      );

      const varId = `var-${symbol}`;
      computationStore.setValue(varId, clampedValue);
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
