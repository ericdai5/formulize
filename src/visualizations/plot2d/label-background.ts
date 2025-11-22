import * as d3 from "d3";

import type { DataPoint } from "./Plot2D";
import { formatVariableValue, getVariableLabel } from "./utils";

/**
 * Creates a label with background rectangle for a point
 */
export function createLabelWithBackground(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  currentPoint: DataPoint,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xAxis: string,
  yAxis: string,
  className: string = "current-point-label"
): void {
  const labelText = `${getVariableLabel(xAxis)}: ${formatVariableValue(Number(currentPoint.x), xAxis)}, ${getVariableLabel(yAxis)}: ${formatVariableValue(Number(currentPoint.y), yAxis)}`;
  const labelX = xScale(currentPoint.x) + 10;
  const labelY = yScale(currentPoint.y) - 10;

  // Create temporary text element to measure dimensions
  const tempText = svg
    .append("text")
    .attr("font-size", "14px")
    .attr("font-family", "Arial, sans-serif")
    .attr("font-weight", "500")
    .text(labelText)
    .style("visibility", "hidden");

  const tempTextNode = tempText.node() as SVGTextElement;
  const bbox = tempTextNode?.getBBox();
  tempText.remove();

  if (bbox) {
    // Calculate centered positioning
    const rectHeight = bbox.height + 8;
    const rectY = labelY - bbox.height - 4;
    const centeredTextY = rectY + rectHeight / 2 + bbox.height / 3; // Adjust for text baseline

    // Add background rectangle with more padding and rounded corners
    svg
      .append("rect")
      .attr("class", `${className}-bg`)
      .attr("x", labelX - 8)
      .attr("y", rectY)
      .attr("width", bbox.width + 16)
      .attr("height", rectHeight)
      .attr("fill", "white")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1)
      .attr("rx", 6);

    // Add label with larger text, centered vertically
    svg
      .append("text")
      .attr("class", className)
      .attr("x", labelX)
      .attr("y", centeredTextY)
      .attr("fill", "#000")
      .attr("text-anchor", "start")
      .attr("font-size", "14px")
      .attr("font-family", "Arial, sans-serif")
      .attr("font-weight", "500")
      .text(labelText);
  }
}
