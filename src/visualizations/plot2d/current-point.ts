import * as d3 from "d3";

import { ComputationStore } from "../../store/computation";
import type { DataPoint } from "./Plot2D";
import { createLabelWithBackground } from "./label-background";

/**
 * Adds current point highlight to the plot
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
  computationStore: ComputationStore
): void {
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

  // Add highlight circle
  svg
    .append("circle")
    .attr("class", "current-point")
    .attr("cx", xScale(currentPoint.x))
    .attr("cy", yScale(currentPoint.y))
    .attr("r", 6)
    .attr("fill", "#ef4444")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  // Add label with background
  createLabelWithBackground(
    svg,
    currentPoint,
    xScale,
    yScale,
    xAxis,
    yAxis,
    computationStore,
    "current-point-label"
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
