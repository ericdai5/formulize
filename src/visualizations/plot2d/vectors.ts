import { runInAction } from "mobx";

import * as d3 from "d3";

import { computationStore } from "../../api/computation";
import { IVector } from "../../types/plot2d";
import { getVariableValue } from "../../util/computation-helpers";
import { VECTOR_DEFAULTS } from "./defaults";
import { createArrowMarker, getMarkerUrl, renderPointMarkers } from "./markers";

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
    renderPointMarkers(svg, vectorData, xScale, yScale, color, vector.markerSize || 4);
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
    let currentTipX = tipData.x;
    let currentTipY = tipData.y;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const drag = d3
      .drag<SVGCircleElement, unknown>()
      .on("start", function (event) {
        isDragging = true;
        // Store initial mouse position in screen coordinates
        lastMouseX = event.sourceEvent.clientX;
        lastMouseY = event.sourceEvent.clientY;
        d3.select(this).attr("stroke", color).attr("stroke-width", 2);
        path.attr(
          "stroke-width",
          (vector.lineWidth || VECTOR_DEFAULTS.lineWidth) + 1
        );
      })
      .on("drag", function (event) {
        if (!isDragging) return;

        // Use absolute mouse coordinates instead of deltas
        const currentMouseX = event.sourceEvent.clientX;
        const currentMouseY = event.sourceEvent.clientY;

        // Calculate our own delta from the last known mouse position
        const deltaX = currentMouseX - lastMouseX;
        const deltaY = currentMouseY - lastMouseY;

        // Update last mouse position
        lastMouseX = currentMouseX;
        lastMouseY = currentMouseY;

        // Get current handle position and apply our calculated delta
        const currentHandleX = parseFloat(d3.select(this).attr("cx"));
        const currentHandleY = parseFloat(d3.select(this).attr("cy"));
        const newX = currentHandleX + deltaX;
        const newY = currentHandleY + deltaY;

        // Clamp to plot boundaries if dimensions are provided
        const clampedX = plotWidth
          ? Math.max(0, Math.min(plotWidth, newX))
          : newX;
        const clampedY = plotHeight
          ? Math.max(0, Math.min(plotHeight, newY))
          : newY;

        // Update the drag handle position immediately
        d3.select(this).attr("cx", clampedX).attr("cy", clampedY);

        // Convert to data coordinates
        const dataX = xScale.invert(clampedX);
        const dataY = yScale.invert(clampedY);

        // Update our tracked tip position
        currentTipX = dataX;
        currentTipY = dataY;

        // Update the vector path to point to new position
        const startPoint = vectorData[0];
        const updatedVectorData = [startPoint, { x: dataX, y: dataY }];

        const line = d3
          .line<VectorData>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y));

        path.datum(updatedVectorData).attr("d", line);

        // Update variables with new tip position
        if (xVars.length > 0 && yVars.length > 0) {
          const endXVar = xVars[xVars.length - 1];
          const endYVar = yVars[yVars.length - 1];

          try {
            runInAction(() => {
              computationStore.setValue(endXVar, currentTipX);
              computationStore.setValue(endYVar, currentTipY);
            });
          } catch (error) {
            console.error("Error updating variables during drag:", error);
          }
        } else {
          console.log("No variables to update:", { xVars, yVars });
        }
      })
      .on("end", function () {
        isDragging = false;
        d3.select(this).attr("stroke", "none");
        path.attr(
          "stroke-width",
          vector.lineWidth || VECTOR_DEFAULTS.lineWidth
        );
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
