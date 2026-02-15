import * as d3 from "d3";

import { ComputationStore } from "../../store/computation";

export interface HoverLinesConfig {
  svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  plotWidth: number;
  plotHeight: number;
  xAxis?: string;
  yAxis?: string;
  computationStore: ComputationStore;
}

/**
 * Adds or updates hover lines for x/y variables
 */
export function updateHoverLines(config: HoverLinesConfig): void {
  const {
    svg,
    xScale,
    yScale,
    plotWidth,
    plotHeight,
    xAxis,
    yAxis,
    computationStore,
  } = config;

  // Remove existing hover lines
  svg.selectAll(".hover-line").remove();

  // Add vertical line for x variable if hovered
  if (xAxis) {
    const xAxisVar = computationStore.variables.get(xAxis);
    const xValue = xAxisVar?.value;
    if (
      xValue !== undefined &&
      typeof xValue === "number" &&
      computationStore.isVariableHighlighted(xAxis)
    ) {
      const xPos = xScale(xValue);

      svg
        .append("line")
        .attr("class", "hover-line hover-line-vertical")
        .attr("x1", xPos)
        .attr("x2", xPos)
        .attr("y1", 0)
        .attr("y2", plotHeight)
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.8);
    }
  }

  // Add horizontal line for y variable if hovered
  if (yAxis) {
    const yAxisVar = computationStore.variables.get(yAxis);
    const yValue = yAxisVar?.value;
    if (
      yValue !== undefined &&
      typeof yValue === "number" &&
      computationStore.isVariableHighlighted(yAxis)
    ) {
      const yPos = yScale(yValue);

      svg
        .append("line")
        .attr("class", "hover-line hover-line-horizontal")
        .attr("x1", 0)
        .attr("x2", plotWidth)
        .attr("y1", yPos)
        .attr("y2", yPos)
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.8);
    }
  }
}
