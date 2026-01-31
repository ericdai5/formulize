import * as d3 from "d3";

import { ComputationStore } from "../../store/computation";
import type { DataPoint } from "./plot-2d";
import { setupCustomDragInteraction } from "./drag";
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
  xAxis?: string,
  yAxis?: string,
  onDragEnd?: () => void,
  interaction?: ["horizontal-drag" | "vertical-drag", string],
  computationStore?: ComputationStore
): void {
  if (!computationStore) return;
  if (!xAxis || !yAxis || dataPoints.length === 0) return;

  // Create hover group with crosshairs (only if not using custom interaction)
  const hover = interaction ? null : createHoverGroup(svg);

  // Create tooltip (only if not using custom interaction)
  const tooltip = interaction ? null : createTooltip(tooltipRef);

  // Create interaction rect
  let isDragging = false;

  // Determine cursor style based on interaction config
  const defaultCursor = interaction
    ? interaction[0] === "vertical-drag"
      ? "ns-resize"
      : "ew-resize"
    : "crosshair";

  const interactionRect = svg
    .append("rect")
    .attr("class", "nodrag") // Prevent ReactFlow canvas dragging
    .attr("width", plotWidth)
    .attr("height", plotHeight)
    .style("fill", "none")
    .style("pointer-events", "all")
    .style("cursor", defaultCursor);

  // Only add hover/tooltip handlers if not using custom interaction
  if (!interaction && hover && tooltip) {
    interactionRect
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
          xAxis,
          yAxis,
          isDragging,
          computationStore
        );
      })
      .on("mousedown", (event) => {
        isDragging = true;
        handleMouseDown(event, hover, tooltip, xScale, xAxis, computationStore);
      })
      .on("mouseup", (event) => {
        isDragging = false;
        handleMouseUp(
          event,
          hover,
          plotWidth,
          plotHeight,
          onDragEnd,
          computationStore
        );
      })
      .on("click", (event) => {
        handleClick(
          event,
          hover,
          dataPoints,
          xScale,
          xAxis,
          isDragging,
          computationStore
        );
      });
  } else if (interaction) {
    // Custom interaction: incremental drag based on mouse delta
    const isDraggingRef = { current: isDragging };
    setupCustomDragInteraction(
      interactionRect,
      interaction,
      isDraggingRef,
      computationStore
    );
  }
}

// Re-export functions from other modules
export { addCurrentPointHighlight } from "./current-point";
