import { useEffect, useRef } from "react";

import { computationStore } from "../api/computation";
import { getInputVariableState } from "../api/variableProcessing";

interface UseVariableDragProps {
  varId: string;
  value: number;
  type: "input" | "output";
  hasDropdownOptions?: boolean;
}

export const useVariableDrag = ({
  varId,
  value,
  type,
  hasDropdownOptions,
}: UseVariableDragProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = nodeRef.current;
    if (!element || type !== "input" || hasDropdownOptions) return;

    let isDragging = false;
    let startY = 0;
    let startValue = value;

    const variableState = getInputVariableState(varId);
    if (!variableState) return;

    const { stepSize, minValue, maxValue } = variableState;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      const deltaY = startY - e.clientY;
      const newValue = startValue + deltaY * stepSize;
      computationStore.setValue(
        varId,
        Math.max(minValue, Math.min(maxValue, newValue))
      );
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        isDragging = false;
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener("mousemove", handleMouseMove, true);
        document.removeEventListener("mouseup", handleMouseUp, true);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startY = e.clientY;
      // Get the current value from the computation store instead of using stale prop
      const currentVariable = computationStore.variables.get(varId);
      startValue = currentVariable?.value ?? 0;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Use capture phase to ensure we get the events first
      document.addEventListener("mousemove", handleMouseMove, true);
      document.addEventListener("mouseup", handleMouseUp, true);
    };

    element.addEventListener("mousedown", handleMouseDown);

    return () => {
      element.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
    };
  }, [varId, type, hasDropdownOptions]);

  return nodeRef;
};
