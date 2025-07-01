import { runInAction } from "mobx";

import * as d3 from "d3";

import { computationStore } from "../../api/computation";
import { TraceConfig } from "../../types/plot2d";
import { getVariableValue } from "../../util/computation-helpers";
import { createArrowMarker, getMarkerUrl } from "./markers";

export interface TraceData {
  x: number;
  y: number;
}

/**
 * Processes trace data by resolving variable references
 */
export function processTraceData(trace: TraceConfig): TraceData[] {
  const xData = trace.x.map((val) =>
    typeof val === "string" ? getVariableValue(val) : val
  );
  const yData = trace.y.map((val) =>
    typeof val === "string" ? getVariableValue(val) : val
  );

  return xData.map((x, i) => ({
    x: Number(x),
    y: Number(yData[i]),
  }));
}

/**
 * Extracts variable names from trace config
 */
function getVariableNames(trace: TraceConfig): {
  xVars: string[];
  yVars: string[];
} {
  const xVars = trace.x.filter((val): val is string => typeof val === "string");

  const yVars = trace.y.filter((val): val is string => typeof val === "string");

  return { xVars, yVars };
}

/**
 * Renders a single trace on the SVG
 */
export function renderTrace(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  trace: TraceConfig,
  traceIndex: number,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  plotWidth?: number,
  plotHeight?: number
): void {
  const traceData = processTraceData(trace);
  const shape = trace.shape || "arrow";
  const color = trace.color || "#3b82f6";
  const isDraggable = trace.draggable !== false && shape === "arrow"; // Default to draggable for arrows

  // Handle point shape differently
  if (shape === "point") {
    // For points, render circles at each data point
    // Always use line color for consistency
    traceData.forEach((point) => {
      svg
        .append("circle")
        .attr("cx", xScale(point.x))
        .attr("cy", yScale(point.y))
        .attr("r", trace.markerSize || 4)
        .attr("fill", color)
        .attr("stroke", color)
        .attr("stroke-width", 1);
    });
    return; // Exit early for points
  }

  // Create arrow marker if needed
  if (shape === "arrow") {
    createArrowMarker(defs, {
      id: `arrowhead-${traceIndex}`,
      color, // Always use line color for consistency
      size: trace.markerSize || 6,
    });
  }

  // Create line generator
  const line = d3
    .line<TraceData>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  // Add the path
  const path = svg
    .append("path")
    .datum(traceData)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", trace.lineWidth || 2)
    .attr("stroke-dasharray", shape === "dash" ? "5,5" : "none")
    .attr(
      "marker-end",
      shape === "arrow" ? getMarkerUrl(`arrowhead-${traceIndex}`) : "none"
    )
    .attr("d", line);

  // Add drag behavior for arrows
  if (isDraggable && traceData.length >= 2) {
    const { xVars, yVars } = getVariableNames(trace);

    // Add invisible drag handle at the arrow tip
    const tipData = traceData[traceData.length - 1];
    const dragHandle = svg
      .append("circle")
      .attr("class", `drag-handle-${traceIndex}`)
      .attr("cx", xScale(tipData.x))
      .attr("cy", yScale(tipData.y))
      .attr("r", 8)
      .attr("fill", "transparent")
      .attr("stroke", "none")
      .style("cursor", "move");

    // Add drag behavior
    const drag = d3
      .drag<SVGCircleElement, unknown>()
      .on("start", function () {
        d3.select(this).attr("stroke", color).attr("stroke-width", 2);
        path.attr("stroke-width", (trace.lineWidth || 2) + 1);
      })
      .on("drag", function (event) {
        // Use delta-based movement for smooth dragging
        const currentX = parseFloat(d3.select(this).attr("cx"));
        const currentY = parseFloat(d3.select(this).attr("cy"));

        const newX = currentX + event.dx;
        const newY = currentY + event.dy;

        // Clamp to plot boundaries if dimensions are provided
        const clampedX = plotWidth
          ? Math.max(0, Math.min(plotWidth, newX))
          : newX;
        const clampedY = plotHeight
          ? Math.max(0, Math.min(plotHeight, newY))
          : newY;

        // Update the circle position immediately for visual feedback
        d3.select(this).attr("cx", clampedX).attr("cy", clampedY);

        // Store the final position for the end event (no live variable updates)
        d3.select(this).datum({
          finalX: clampedX,
          finalY: clampedY,
          dataX: xScale.invert(clampedX),
          dataY: yScale.invert(clampedY),
        });
      })
      .on("end", function () {
        d3.select(this).attr("stroke", "none");
        path.attr("stroke-width", trace.lineWidth || 2);

        // Update variables only when dragging ends
        const finalData = d3.select(this).datum() as {
          dataX: number;
          dataY: number;
        };
        if (finalData && xVars.length > 0 && yVars.length > 0) {
          const endXVar = xVars[xVars.length - 1];
          const endYVar = yVars[yVars.length - 1];

          try {
            runInAction(() => {
              computationStore.setValue(endXVar, finalData.dataX);
              computationStore.setValue(endYVar, finalData.dataY);
            });
          } catch (error) {
            console.error("Error updating variables:", error);
          }
        }
      });

    dragHandle.call(drag);
  }
}

/**
 * Renders all traces on the SVG
 */
export function renderTraces(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  traces: TraceConfig[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  plotWidth?: number,
  plotHeight?: number
): void {
  traces.forEach((trace, index) => {
    renderTrace(svg, defs, trace, index, xScale, yScale, plotWidth, plotHeight);
  });
}
