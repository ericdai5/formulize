import { runInAction } from "mobx";

import * as d3 from "d3";

import { ComputationStore } from "../../store/computation";

/**
 * Sets up custom drag interaction for plot2d
 * Enables incremental variable updates based on mouse delta
 */
export function setupCustomDragInteraction(
  interactionRect: d3.Selection<SVGRectElement, unknown, null, undefined>,
  interaction: ["horizontal-drag" | "vertical-drag", string],
  isDraggingRef: { current: boolean },
  computationStore: ComputationStore
): void {
  // Custom interaction: incremental drag based on mouse delta
  let startY = 0;
  let startX = 0;
  let startValue = 0;

  const handleMove = (event: MouseEvent) => {
    if (!isDraggingRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    const [interactionType, customVar] = interaction;

    // Get the target variable from scoped store
    const targetVariable = computationStore.variables.get(customVar);
    if (!targetVariable) return;

    const stepSize = targetVariable.step || 0.01;
    const minValue = targetVariable.range?.[0] ?? 0;
    const maxValue = targetVariable.range?.[1] ?? 1;

    // Sensitivity multiplier: smaller = less sensitive, larger = more sensitive
    const sensitivity = 0.1;

    let newValue: number;
    if (interactionType === "vertical-drag") {
      // Vertical: up = increase, down = decrease
      const deltaY = startY - event.clientY;
      newValue = startValue + deltaY * stepSize * sensitivity;
    } else {
      // Horizontal: right = increase, left = decrease
      const deltaX = event.clientX - startX;
      newValue = startValue + deltaX * stepSize * sensitivity;
    }

    // Clamp to range
    newValue = Math.max(minValue, Math.min(maxValue, newValue));

    runInAction(() => {
      computationStore.setValue(customVar, newValue);
    });
  };

  const handleUp = (event: MouseEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      computationStore.setDragging(false);
      event.preventDefault();
      event.stopPropagation();
      document.removeEventListener("mousemove", handleMove, true);
      document.removeEventListener("mouseup", handleUp, true);
    }
  };

  interactionRect.on("mousedown", (event) => {
    isDraggingRef.current = true;
    computationStore.setDragging(true);
    event.preventDefault();
    event.stopPropagation();

    const [, customVar] = interaction;

    startY = event.clientY;
    startX = event.clientX;

    // Get current value from scoped computation store
    const currentVariable = computationStore.variables.get(customVar);
    const value = currentVariable?.value;
    startValue = typeof value === "number" ? value : 0;

    // Add document-level listeners with capture phase
    document.addEventListener("mousemove", handleMove, true);
    document.addEventListener("mouseup", handleUp, true);
  });
}
