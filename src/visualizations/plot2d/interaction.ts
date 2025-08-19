import * as d3 from "d3";

import type { DataPoint } from "./Plot2D";
import { createHoverGroup } from "./hover";
import {
  handleClick,
  handleMouseDown,
  handleMouseMove,
  handleMouseOut,
  handleMouseOver,
  handleMouseUp,
} from "./mouse-handlers";
import { createTooltip } from "./tooltip";

/**
 * Adds interactive tooltip and hover functionality to the plot
 */
export function addInteractions(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  tooltipRef: React.RefObject<HTMLDivElement>,
  dataPoints: DataPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  plotWidth: number,
  plotHeight: number,
  xVar?: string,
  yVar?: string,
  onDragEnd?: () => void
): void {
  if (!xVar || !yVar || dataPoints.length === 0) return;

  // Create hover group with crosshairs
  const hover = createHoverGroup(svg);

  // Create tooltip
  const tooltip = createTooltip(tooltipRef);

  // Create interaction rect
  let isDragging = false;

  svg
    .append("rect")
    .attr("width", plotWidth)
    .attr("height", plotHeight)
    .style("fill", "none")
    .style("pointer-events", "all")
    .style("cursor", "crosshair")
    .on("mouseover", () => {
      handleMouseOver(hover, tooltip, isDragging);
    })
    .on("mouseout", () => {
      handleMouseOut(hover, tooltip, svg, isDragging);
    })
    .on("mousemove", (event) => {
      handleMouseMove(
        event,
        hover,
        tooltip,
        svg,
        dataPoints,
        xScale,
        yScale,
        plotWidth,
        plotHeight,
        xVar,
        yVar,
        isDragging
      );
    })
    .on("mousedown", (event) => {
      isDragging = true;
      handleMouseDown(event, hover, tooltip, xScale, xVar);
    })
    .on("mouseup", (event) => {
      isDragging = false;
      handleMouseUp(event, hover, plotWidth, plotHeight, onDragEnd);
    })
    .on("click", (event) => {
      handleClick(event, hover, dataPoints, xScale, xVar, isDragging);
    });
}

// Re-export functions from other modules
export { addCurrentPointHighlight } from "./current-point";
