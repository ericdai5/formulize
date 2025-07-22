import { computationStore } from "../../api/computation";
import {
  findVariableByElement,
  getInputVariableState,
} from "../../api/variableProcessing";

export const dragHandler = (container: HTMLElement) => {
  if (!container) return;

  const slidableElements = container.querySelectorAll(
    ".interactive-var-slidable"
  );

  slidableElements.forEach((element) => {
    let isDragging = false;
    let startY = 0;

    const variableMatch = findVariableByElement(element as HTMLElement);
    if (!variableMatch) {
      return;
    }

    const { varId } = variableMatch;
    const variableState = getInputVariableState(varId);
    if (!variableState) {
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
