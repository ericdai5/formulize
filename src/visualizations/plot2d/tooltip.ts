import * as d3 from "d3";

import { formatVariableValue, getVariableLabel } from "./utils";

/**
 * Creates and configures the tooltip element
 */
export function createTooltip(
  tooltipRef: React.RefObject<HTMLDivElement>
) {
  return d3
    .select(tooltipRef.current)
    .attr("class", "tooltip")
    .style("display", "none")
    .style("position", "absolute")
    .style("background", "rgba(255, 255, 255, 0.9)")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
    .style("pointer-events", "none")
    .style("font-size", "12px");
}

/**
 * Updates tooltip content and position
 */
export function updateTooltip(
  tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
  x: number,
  y: number,
  pageX: number,
  pageY: number,
  xVar: string,
  yVar: string
): void {
  tooltip
    .style("left", `${pageX + 10}px`)
    .style("top", `${pageY - 30}px`)
    .html(
      `${getVariableLabel(xVar)}: ${formatVariableValue(Number(x), xVar)}<br>${getVariableLabel(yVar)}: ${formatVariableValue(Number(y), yVar)}`
    );
}

/**
 * Shows or hides the tooltip
 */
export function setTooltipVisibility(
  tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
  visible: boolean
): void {
  tooltip.style("display", visible ? "block" : "none");
}