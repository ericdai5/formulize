import { runInAction } from "mobx";

import * as d3 from "d3";

import { ComputationStore } from "../../store/computation";
import { IVector } from "../../types/graph2d";
import { VECTOR_DEFAULTS } from "./defaults";
import { createArrowMarker, getMarkerUrl, renderPointMarkers } from "./markers";

export interface VectorData {
  x: number;
  y: number;
}

function resolveVectorPoint(
  sampleId: string,
  computationStore: ComputationStore,
  pointCache: Map<string, VectorData | null>
): VectorData | null {
  if (pointCache.has(sampleId)) {
    return pointCache.get(sampleId) ?? null;
  }

  const point = computationStore.sample2DPoint(sampleId);
  const resolvedPoint = point
    ? {
        x: Number(point.x),
        y: Number(point.y),
      }
    : null;
  pointCache.set(sampleId, resolvedPoint);
  return resolvedPoint;
}

/**
 * Processes vector data by resolving endpoints from sample() IDs.
 */
export function processVectorData(
  vector: IVector,
  computationStore: ComputationStore,
  pointCache: Map<string, VectorData | null>
): VectorData[] {
  const startPoint = resolveVectorPoint(
    vector.startSampleId,
    computationStore,
    pointCache
  );
  const endPoint = resolveVectorPoint(
    vector.endSampleId,
    computationStore,
    pointCache
  );

  if (vector.shape === "point") {
    return endPoint ? [endPoint] : [];
  }

  if (!startPoint || !endPoint) {
    return [];
  }

  return [startPoint, endPoint];
}

/**
 * Extracts interaction variable names from vector config.
 */
function getVectorInteractionVariables(vector: IVector): {
  xAxisVariable?: string;
  yAxisVariable?: string;
  allVectorVariables: string[];
} {
  const xAxisVariable = vector.interaction?.[0];
  const yAxisVariable = vector.interaction?.[1];
  return {
    xAxisVariable,
    yAxisVariable,
    allVectorVariables: [xAxisVariable, yAxisVariable].filter(
      (varId): varId is string => !!varId
    ),
  };
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
  pointCache: Map<string, VectorData | null>,
  plotWidth?: number,
  plotHeight?: number,
  computationStore?: ComputationStore
): void {
  if (!computationStore) return;
  const vectorData = processVectorData(vector, computationStore, pointCache);
  if (vectorData.length === 0) return;
  const shape = vector.shape || VECTOR_DEFAULTS.shape;
  const color = vector.color || VECTOR_DEFAULTS.color;
  const isDraggable =
    vector.draggable !== false &&
    shape === "arrow" &&
    Array.isArray(vector.interaction);

  // Handle point shape differently
  if (shape === "point") {
    renderPointMarkers(
      svg,
      vectorData,
      xScale,
      yScale,
      color,
      vector.markerSize || 4
    );
    return; // Exit early for points
  }

  if (vectorData.length < 2) return;

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

  // Add invisible wider hover area for easier interaction
  const hoverPath = svg
    .append("path")
    .datum(vectorData)
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr(
      "stroke-width",
      Math.max(20, (vector.lineWidth || VECTOR_DEFAULTS.lineWidth) * 4)
    ) // Much wider hover area
    .attr("d", line)
    .style("cursor", "pointer");

  // Add the visible path
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
    .attr("d", line)
    .style("pointer-events", "none"); // Disable pointer events on visible path

  // Add hover functionality to the invisible wider path
  const { allVectorVariables } = getVectorInteractionVariables(vector);

  hoverPath
    .on("mouseenter", function () {
      // Highlight the visible vector
      path
        .attr(
          "stroke-width",
          (vector.lineWidth || VECTOR_DEFAULTS.lineWidth) + 2
        )
        .attr("opacity", 0.8);

      // Set hover state for all variables in this vector
      allVectorVariables.forEach((varId) => {
        computationStore.setVariableHover(varId, true);
      });
    })
    .on("mouseleave", function () {
      // Reset the visible vector appearance
      path
        .attr("stroke-width", vector.lineWidth || VECTOR_DEFAULTS.lineWidth)
        .attr("opacity", 1);

      // Clear hover state for all variables in this vector
      allVectorVariables.forEach((varId) => {
        computationStore.setVariableHover(varId, false);
      });
    });

  // Label rendering
  if (vector.label) {
    const position = vector.labelPosition ?? VECTOR_DEFAULTS.labelPosition;
    const labelColor = vector.labelColor ?? VECTOR_DEFAULTS.labelColor ?? color;
    const fontSize = vector.labelFontSize ?? VECTOR_DEFAULTS.labelFontSize;
    const startPoint = vectorData[0];
    const endPoint = vectorData[vectorData.length - 1];

    let point: VectorData;
    let offsetX = vector.labelOffsetX ?? VECTOR_DEFAULTS.labelOffsetX;
    let offsetY = vector.labelOffsetY ?? VECTOR_DEFAULTS.labelOffsetY;

    // Base direction from start to end for computing the normal
    const baseDx = endPoint.x - startPoint.x;
    const baseDy = endPoint.y - startPoint.y;
    const baseLen = Math.sqrt(baseDx * baseDx + baseDy * baseDy);

    if (position === "start") {
      point = startPoint;
      if (baseLen > 0) {
        const unitX = baseDx / baseLen;
        const unitY = baseDy / baseLen;
        const normalX = -unitY;
        const normalY = unitX;
        const screenOffsetDistance = Math.sqrt(
          offsetX * offsetX + offsetY * offsetY
        );
        const dataOffsetDistance =
          screenOffsetDistance /
          Math.min(
            Math.abs(xScale(1) - xScale(0)),
            Math.abs(yScale(1) - yScale(0))
          );
        offsetX = normalX * dataOffsetDistance;
        offsetY = normalY * dataOffsetDistance;
      }
    } else if (position === "mid") {
      // Calculate true midpoint between start and end
      point = {
        x: (startPoint.x + endPoint.x) / 2,
        y: (startPoint.y + endPoint.y) / 2,
      };

      // Calculate normal vector for perpendicular positioning (use base direction)
      if (baseLen > 0) {
        const unitX = baseDx / baseLen;
        const unitY = baseDy / baseLen;
        const normalX = -unitY;
        const normalY = unitX;
        const screenOffsetDistance = Math.sqrt(
          offsetX * offsetX + offsetY * offsetY
        );
        const dataOffsetDistance =
          screenOffsetDistance /
          Math.min(
            Math.abs(xScale(1) - xScale(0)),
            Math.abs(yScale(1) - yScale(0))
          );
        offsetX = normalX * dataOffsetDistance;
        offsetY = normalY * dataOffsetDistance;
      }
    } else {
      // end
      point = endPoint;
      if (baseLen > 0) {
        const unitX = baseDx / baseLen;
        const unitY = baseDy / baseLen;
        const normalX = -unitY;
        const normalY = unitX;
        const screenOffsetDistance = Math.sqrt(
          offsetX * offsetX + offsetY * offsetY
        );
        const dataOffsetDistance =
          screenOffsetDistance /
          Math.min(
            Math.abs(xScale(1) - xScale(0)),
            Math.abs(yScale(1) - yScale(0))
          );
        offsetX = normalX * dataOffsetDistance;
        offsetY = normalY * dataOffsetDistance;
      }
    }

    svg
      .append("text")
      .attr("class", `vector-label-${vectorIndex}`)
      .attr("x", xScale(point.x + offsetX))
      .attr("y", yScale(point.y + offsetY))
      .attr("fill", labelColor)
      .attr("font-size", fontSize)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "start")
      .text(vector.label);
  }

  // Add drag behavior for arrows
  if (isDraggable && vectorData.length >= 2) {
    const { xAxisVariable, yAxisVariable } = getVectorInteractionVariables(
      vector
    );
    if (!xAxisVariable || !yAxisVariable) return;

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
      .style("cursor", "move")
      .on("mouseenter", function () {
        // Set hover state for all variables in this vector
        allVectorVariables.forEach((varId) => {
          computationStore.setVariableHover(varId, true);
        });
      })
      .on("mouseleave", function () {
        // Clear hover state for all variables in this vector
        allVectorVariables.forEach((varId) => {
          computationStore.setVariableHover(varId, false);
        });
      });

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

        // If a label exists, update its position while dragging
        if (vector.label) {
          const pos = vector.labelPosition ?? VECTOR_DEFAULTS.labelPosition;
          const labelSelection = svg.select<SVGTextElement>(
            `text.vector-label-${vectorIndex}`
          );
          if (!labelSelection.empty()) {
            if (pos === "end") {
              // Perpendicular offset at the tip during drag
              const startPoint = vectorData[0];
              const dx = currentTipX - startPoint.x;
              const dy = currentTipY - startPoint.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              let offsetX = vector.labelOffsetX ?? VECTOR_DEFAULTS.labelOffsetX;
              let offsetY = vector.labelOffsetY ?? VECTOR_DEFAULTS.labelOffsetY;
              if (length > 0) {
                const unitX = dx / length;
                const unitY = dy / length;
                const normalX = -unitY;
                const normalY = unitX;
                const screenOffsetDistance = Math.sqrt(
                  offsetX * offsetX + offsetY * offsetY
                );
                const dataOffsetDistance =
                  screenOffsetDistance /
                  Math.min(
                    Math.abs(xScale(1) - xScale(0)),
                    Math.abs(yScale(1) - yScale(0))
                  );
                offsetX = normalX * dataOffsetDistance;
                offsetY = normalY * dataOffsetDistance;
              }
              labelSelection
                .attr("x", xScale(currentTipX + offsetX))
                .attr("y", yScale(currentTipY + offsetY));
            } else if (pos === "mid") {
              const startPoint = vectorData[0];
              const midX = (startPoint.x + currentTipX) / 2;
              const midY = (startPoint.y + currentTipY) / 2;

              // Calculate normal vector for perpendicular positioning
              const dx = currentTipX - startPoint.x;
              const dy = currentTipY - startPoint.y;
              const length = Math.sqrt(dx * dx + dy * dy);

              let offsetX = vector.labelOffsetX ?? VECTOR_DEFAULTS.labelOffsetX;
              let offsetY = vector.labelOffsetY ?? VECTOR_DEFAULTS.labelOffsetY;

              if (length > 0) {
                // Normalize the vector
                const unitX = dx / length;
                const unitY = dy / length;

                // Calculate perpendicular vector (rotate 90 degrees counterclockwise)
                const normalX = -unitY;
                const normalY = unitX;

                // Use a fixed offset distance in data coordinates
                const screenOffsetDistance = Math.sqrt(
                  offsetX * offsetX + offsetY * offsetY
                );
                const dataOffsetDistance =
                  screenOffsetDistance /
                  Math.min(
                    Math.abs(xScale(1) - xScale(0)),
                    Math.abs(yScale(1) - yScale(0))
                  );

                offsetX = normalX * dataOffsetDistance;
                offsetY = normalY * dataOffsetDistance;
              }

              labelSelection
                .attr("x", xScale(midX + offsetX))
                .attr("y", yScale(midY + offsetY));
            } // start position does not move when dragging the tip
          }
        }

        // Update variables with new tip position
        try {
          runInAction(() => {
            computationStore.setValue(xAxisVariable, currentTipX);
            computationStore.setValue(yAxisVariable, currentTipY);
          });
        } catch (error) {
          console.error("Error updating variables during drag:", error);
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
 * Collects all X and Y variable names from all vectors
 */
export function getAllVectorVariables(vectors: IVector[]): {
  allXVariables: string[];
  allYVariables: string[];
} {
  const allXVariables = new Set<string>();
  const allYVariables = new Set<string>();

  vectors.forEach((vector) => {
    const { xAxisVariable, yAxisVariable } = getVectorInteractionVariables(
      vector
    );
    if (xAxisVariable) {
      allXVariables.add(xAxisVariable);
    }
    if (yAxisVariable) {
      allYVariables.add(yAxisVariable);
    }
  });

  return {
    allXVariables: Array.from(allXVariables),
    allYVariables: Array.from(allYVariables),
  };
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
  plotHeight?: number,
  computationStore?: ComputationStore
): void {
  if (!computationStore) return;
  const pointCache = new Map<string, VectorData | null>();
  vectors.forEach((vector, index) => {
    renderVector(
      svg,
      defs,
      vector,
      index,
      xScale,
      yScale,
      pointCache,
      plotWidth,
      plotHeight,
      computationStore
    );
  });
}
