import * as d3 from "d3";

import { ComputationStore } from "../../store/computation";
import type { DataPoint } from "./plot-2d";
import { createLabelWithBackground } from "./label-background";

/**
 * Adds current point highlight to the plot
 * @param color - Optional color for the point (defaults to red #ef4444)
 * @param lineIndex - Index of the line (for unique identification and label positioning)
 */
export function addCurrentPointHighlight(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  currentPoint: DataPoint | null,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xRange: [number, number],
  yRange: [number, number],
  xAxis: string | undefined,
  yAxis: string | undefined,
  computationStore: ComputationStore,
  color?: string,
  lineIndex: number = 0
): void {
  // In step mode (actively stepping through history), don't render the current point
  // Check isStepMode from computation store rather than just having history
  const isInStepMode = computationStore.isStepMode();
  if (isInStepMode) {
    return;
  }

  if (
    !currentPoint ||
    !xAxis ||
    !yAxis ||
    currentPoint.x < xRange[0] ||
    currentPoint.x > xRange[1] ||
    currentPoint.y < yRange[0] ||
    currentPoint.y > yRange[1]
  ) {
    return;
  }

  const pointColor = color || "#ef4444"; // Default to red

  // Add highlight circle with unique class per line
  svg
    .append("circle")
    .attr("class", `current-point current-point-${lineIndex}`)
    .attr("cx", xScale(currentPoint.x))
    .attr("cy", yScale(currentPoint.y))
    .attr("r", 6)
    .attr("fill", pointColor)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  // Add label with background (offset vertically for each line to prevent overlap)
  createLabelWithBackground(
    svg,
    currentPoint,
    xScale,
    yScale,
    xAxis,
    yAxis,
    computationStore,
    `current-point-label-${lineIndex}`,
    lineIndex // Pass index for vertical offset
  );
}

/**
 * Scales the current point up or down for hover effect
 */
export function scaleCurrentPoint(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  scaleUp: boolean
): void {
  const currentPointCircle = svg.select("circle.current-point");
  if (!currentPointCircle.empty()) {
    currentPointCircle
      .transition()
      .duration(150)
      .attr("r", scaleUp ? 9 : 6); // Scale from 6 to 9 on hover
  }
}
