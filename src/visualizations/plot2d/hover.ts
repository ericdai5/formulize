import * as d3 from "d3";

import type { DataPoint } from "./plot-2d";

/**
 * Creates the hover group with circle and crosshair lines
 */
export function createHoverGroup(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>
): d3.Selection<SVGGElement, unknown, null, undefined> {
  const hover = svg.append("g").attr("class", "hover").style("display", "none");

  hover.append("circle").attr("r", 4).attr("fill", "#3b82f6");
  
  // Add crosshair lines
  hover
    .append("line")
    .attr("class", "crosshair-vertical")
    .attr("stroke", "#3b82f6")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3")
    .attr("opacity", 0.7);
    
  hover
    .append("line")
    .attr("class", "crosshair-horizontal")
    .attr("stroke", "#3b82f6")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3")
    .attr("opacity", 0.7);

  return hover;
}

/**
 * Updates the hover group position and crosshair lines
 */
export function updateHoverPosition(
  hover: d3.Selection<SVGGElement, unknown, null, undefined>,
  point: DataPoint,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  plotWidth: number,
  plotHeight: number
): void {
  // Update hover circle position
  hover.select("circle").attr("cx", xScale(point.x)).attr("cy", yScale(point.y));
  
  // Update crosshair lines
  hover
    .select(".crosshair-vertical")
    .attr("x1", xScale(point.x))
    .attr("x2", xScale(point.x))
    .attr("y1", 0)
    .attr("y2", plotHeight);
    
  hover
    .select(".crosshair-horizontal")
    .attr("x1", 0)
    .attr("x2", plotWidth)
    .attr("y1", yScale(point.y))
    .attr("y2", yScale(point.y));
}

/**
 * Shows or hides the hover group
 */
export function setHoverVisibility(
  hover: d3.Selection<SVGGElement, unknown, null, undefined>,
  visible: boolean
): void {
  hover.style("display", visible ? "block" : "none");
}