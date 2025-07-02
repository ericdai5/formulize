import { runInAction } from "mobx";

import * as d3 from "d3";

import { computationStore } from "../../api/computation";
import { IVector } from "../../types/plot2d";
import { getVariableValue } from "../../util/computation-helpers";
import { VECTOR_DEFAULTS } from "./defaults";
import { createArrowMarker, getMarkerUrl } from "./markers";

export interface VectorData {
  x: number;
  y: number;
}

/**
 * Processes vector data by resolving variable references
 */
export function processVectorData(vector: IVector): VectorData[] {
  const xData = vector.x.map((val) =>
    typeof val === "string" ? getVariableValue(val) : val
  );
  const yData = vector.y.map((val) =>
    typeof val === "string" ? getVariableValue(val) : val
  );

  return xData.map((x, i) => ({
    x: Number(x),
    y: Number(yData[i]),
  }));
}

/**
 * Extracts variable names from vector config
 */
function getVariableNames(vector: IVector): {
  xVars: string[];
  yVars: string[];
} {
  const xVars = vector.x.filter(
    (val): val is string => typeof val === "string"
  );
  const yVars = vector.y.filter(
    (val): val is string => typeof val === "string"
  );
  return { xVars, yVars };
}

/**
 * Renders a single vector on the SVG
 */
export function renderVector(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  vector: IVector,
  vectorIndex: number,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  plotWidth?: number,
  plotHeight?: number
): void {
  const vectorData = processVectorData(vector);
  const shape = vector.shape || VECTOR_DEFAULTS.shape;
  const color = vector.color || VECTOR_DEFAULTS.color;
  const isDraggable = vector.draggable !== false && shape === "arrow";

  // Handle point shape differently
  if (shape === "point") {
    // For points, render circles at each data point
    // Always use line color for consistency
    vectorData.forEach((point) => {
      svg
        .append("circle")
        .attr("cx", xScale(point.x))
        .attr("cy", yScale(point.y))
        .attr("r", vector.markerSize || 4)
        .attr("fill", color)
        .attr("stroke", color)
        .attr("stroke-width", 1);
    });
    return; // Exit early for points
  }

  // Create arrow marker if needed
  if (shape === "arrow") {
    createArrowMarker(defs, {
      id: `arrowhead-${vectorIndex}`,
      color,
      size: vector.markerSize || VECTOR_DEFAULTS.markerSize,
    });
  }

  // Create line generator
  const line = d3
    .line<VectorData>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  // Add the path
  const path = svg
    .append("path")
    .datum(vectorData)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", vector.lineWidth || VECTOR_DEFAULTS.lineWidth)
    .attr("stroke-dasharray", shape === "dash" ? "5,5" : "none")
    .attr(
      "marker-end",
      shape === "arrow" ? getMarkerUrl(`arrowhead-${vectorIndex}`) : "none"
    )
    .attr("d", line);

  // Add drag behavior for arrows
  if (isDraggable && vectorData.length >= 2) {
    const { xVars, yVars } = getVariableNames(vector);

    // Add invisible drag handle at the arrow tip
    const tipData = vectorData[vectorData.length - 1];
    const dragHandle = svg
      .append("circle")
      .attr("class", `drag-handle-${vectorIndex}`)
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
        path.attr(
          "stroke-width",
          (vector.lineWidth || VECTOR_DEFAULTS.lineWidth) + 1
        );
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
        path.attr(
          "stroke-width",
          vector.lineWidth || VECTOR_DEFAULTS.lineWidth
        );

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
 * Renders all vectors on the SVG
 */
export function renderVectors(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  vectors: IVector[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  plotWidth?: number,
  plotHeight?: number
): void {
  vectors.forEach((vector, index) => {
    renderVector(
      svg,
      defs,
      vector,
      index,
      xScale,
      yScale,
      plotWidth,
      plotHeight
    );
  });
}
