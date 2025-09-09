import * as d3 from "d3";

import type { DataPoint } from "./Plot2D";
import { formatVariableValue, getVariableLabel } from "./utils";

/**
 * Updates the current point label during real-time interaction
 */
export function updateCurrentPointLabel(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  currentPoint: DataPoint,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xAxisVar?: string,
  yAxisVar?: string
): void {
  if (!xAxisVar || !yAxisVar) return;

  // Update existing current point label
  const labelText = `${getVariableLabel(xAxisVar)}: ${formatVariableValue(Number(currentPoint.x), xAxisVar)}, ${getVariableLabel(yAxisVar)}: ${formatVariableValue(Number(currentPoint.y), yAxisVar)}`;
  const labelX = xScale(currentPoint.x) + 10;
  const labelY = yScale(currentPoint.y) - 10;

  const labelElement = svg.select("text.current-point-label");
  labelElement
    .attr("x", labelX)
    .attr("font-size", "16px")
    .attr("font-family", "Arial, sans-serif")
    .attr("font-weight", "500")
    .text(labelText);

  // Update background rectangle position and size with centered positioning
  const labelNode = labelElement.node() as SVGTextElement;
  if (labelNode) {
    const bbox = labelNode.getBBox();
    const rectHeight = bbox.height + 8;
    const rectY = labelY - bbox.height - 4;
    const centeredTextY = rectY + rectHeight / 2 + bbox.height / 3; // Adjust for text baseline

    // Update text y position to be centered
    labelElement.attr("y", centeredTextY);

    // Update background rectangle
    svg
      .select("rect.current-point-label-bg")
      .attr("x", labelX - 8)
      .attr("y", rectY)
      .attr("width", bbox.width + 16)
      .attr("height", rectHeight);
  }
}
