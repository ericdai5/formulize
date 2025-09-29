import * as d3 from "d3";

import { computationStore } from "../../store/computation";

export interface HoverLinesConfig {
  svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  plotWidth: number;
  plotHeight: number;
  xAxisVar?: string;
  yAxisVar?: string;
}

/**
 * Adds or updates hover lines for x/y variables
 */
export function updateHoverLines(config: HoverLinesConfig): void {
  const { svg, xScale, yScale, plotWidth, plotHeight, xAxisVar, yAxisVar } =
    config;

  // Remove existing hover lines
  svg.selectAll(".hover-line").remove();

  // Add vertical line for x variable if hovered
  if (xAxisVar) {
    const xAxisVariable = computationStore.variables.get(xAxisVar);
    if (
      xAxisVariable?.value !== undefined &&
      computationStore.hoverStates.get(xAxisVar)
    ) {
      const xPos = xScale(xAxisVariable.value);

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
  if (yAxisVar) {
    const yAxisVariable = computationStore.variables.get(yAxisVar);
    if (
      yAxisVariable?.value !== undefined &&
      computationStore.hoverStates.get(yAxisVar)
    ) {
      const yPos = yScale(yAxisVariable.value);

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
