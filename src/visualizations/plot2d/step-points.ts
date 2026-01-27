import * as d3 from "d3";

import { ExecutionStore } from "../../store/execution";

export const STEP_POINTS_EXTENSION_KEY = "stepPoints";

/**
 * Point data structure for rendering.
 */
export interface PointData {
  x: number;
  y: number;
  color?: string;
  size?: number;
  label?: string;
}

/**
 * Renders step points on the plot.
 * Reads resolved values from step.extensions which are populated by Plot2D.
 */
export class StepPointsRenderer {
  /**
   * Render points from the current step's extensions.
   */
  public render(
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    xRange: [number, number],
    yRange: [number, number],
    executionStore: ExecutionStore
  ): void {
    const currentStep = executionStore.history[executionStore.historyIndex];
    if (!currentStep) return;

    const extensionItems = currentStep.extensions?.[STEP_POINTS_EXTENSION_KEY];
    if (!extensionItems || !Array.isArray(extensionItems)) return;

    extensionItems.forEach((item, idx) => {
      const { xValue, yValue, color, size, label } = item.data as {
        xValue: number;
        yValue: number;
        color?: string;
        size?: number;
        label?: string;
      };

      // Skip points outside the visible range
      if (xValue < xRange[0] || xValue > xRange[1] || yValue < yRange[0] || yValue > yRange[1]) {
        return;
      }

      this.renderPoint(svg, { x: xValue, y: yValue, color, size, label }, idx, xScale, yScale);
    });
  }

  private renderPoint(
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    point: PointData,
    index: number,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>
  ): void {
    const { x, y } = point;
    const color = point.color || "#3b82f6";
    const size = point.size || 6;
    const label = point.label;
    const pointId = `step-point-${index}-${x}-${y}`;
    svg
      .append("circle")
      .attr("class", "step-point")
      .attr("id", pointId)
      .attr("cx", xScale(x))
      .attr("cy", yScale(y))
      .attr("r", size)
      .attr("fill", color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("opacity", 0.9);
    if (label) {
      svg
        .append("g")
        .attr("class", "step-point-label")
        .attr("id", `${pointId}-label`)
        .append("text")
        .attr("x", xScale(x))
        .attr("y", yScale(y) - size - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", color)
        .text(label);
    }
  }
}
