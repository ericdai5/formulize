import React, { useCallback, useEffect, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import * as d3 from "d3";

import { useFormulize } from "../../core/hooks";
import { ComputationStore } from "../../store/computation";
import {
  type I2DLine,
  type I2DPoint,
  type IPlot2D,
  type IVector,
} from "../../types/plot2d";
import { type AxisLabelInfo, addAxes, addGrid } from "./axes";
import { AxisLabels } from "./axis-labels";
import { PLOT2D_DEFAULTS } from "./defaults";
import { calculatePlotDimensions } from "./utils";
import { getAllVectorVariables, renderVectors } from "./vectors";

interface Plot2DProps {
  config: IPlot2D;
}

export interface DataPoint {
  x: number;
  y: number;
}

// Graph-based line data structure
interface GraphLineData {
  name: string;
  points: DataPoint[];
  color: string;
  lineWidth: number;
  showInLegend: boolean;
}

// Graph-based point data structure
interface GraphPointData {
  name: string;
  point: DataPoint;
  color: string;
  size: number;
  showInLegend: boolean;
  showLabel: boolean;
  interaction?: ["horizontal-drag" | "vertical-drag", string];
}

/**
 * Calculate graph-based visualizations using explicit data2d() calls.
 * Graph configs declare id to match data2d() calls and parameter for sampling.
 */
function calculateGraphData(
  graphs: IPlot2D["graphs"],
  computationStore: ComputationStore
): { lines: GraphLineData[]; points: GraphPointData[] } {
  const lineResults: GraphLineData[] = [];
  const pointResults: GraphPointData[] = [];

  if (!graphs || graphs.length === 0) {
    return { lines: lineResults, points: pointResults };
  }

  for (const graphConfig of graphs) {
    const graphType = graphConfig.type;
    const { id: graphId, name, showInLegend = true } = graphConfig;
    const displayName = name || graphId;

    if (graphType === "line") {
      const lineConfig = graphConfig as I2DLine;
      const {
        parameter,
        range,
        samples = 100,
        color = "#3b82f6",
        lineWidth = 2,
      } = lineConfig;

      // Get range from config or from parameter variable's range
      let sampleRange = range;
      if (!sampleRange) {
        const paramVariable = computationStore.variables.get(parameter);
        sampleRange = paramVariable?.range ?? [0, 10];
      }

      // Sample the manual function across the range
      const points = computationStore.sample2DLine(
        parameter,
        sampleRange,
        samples,
        graphId
      );

      if (points.length > 0) {
        lineResults.push({
          name: displayName,
          points,
          color,
          lineWidth,
          showInLegend,
        });
      }
    } else if (graphType === "point") {
      const pointConfig = graphConfig as I2DPoint;
      const {
        color = "#ef4444",
        size = 6,
        showLabel = true,
        interaction,
        stepId,
        persistence,
      } = pointConfig;
      // Run once with current values to get the current point
      const point = computationStore.sample2DPoint(graphId);
      if (point) {
        pointResults.push({
          name: displayName,
          point,
          color,
          size,
          showInLegend,
          showLabel,
          interaction,
          stepId,
          persistence,
        });
      }
    }
  }

  return { lines: lineResults, points: pointResults };
}

const Plot2D: React.FC<Plot2DProps> = observer(({ config }) => {
  const context = useFormulize();
  const computationStore = context?.computationStore;
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const axisLabelInfoRef = useRef<AxisLabelInfo>({});
  // Track if drag is happening on THIS plot (to distinguish from formula variable drag)
  const isLocalDragRef = useRef(false);
  // Track focus state for graph interaction (persists across re-renders)
  // Now includes index to support multiple lines/points
  const focusStateRef = useRef<{
    type: "line" | "point";
    index: number;
  } | null>(null);
  // Track if currently dragging (persists across re-renders to fix closure issue)
  const isDraggingRef = useRef(false);
  // Store event handler references to properly remove them across re-renders
  const globalMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const globalMouseUpRef = useRef<(() => void) | null>(null);

  // Parse configuration options with defaults
  const {
    xAxisInterval,
    xAxisPos,
    xLabelPos,
    xGrid = "show",
    yAxisInterval,
    yAxisPos,
    yLabelPos,
    yGrid = "show",
    vectors,
    graphs,
    width = PLOT2D_DEFAULTS.width,
    height = PLOT2D_DEFAULTS.height,
    interaction,
  } = config;

  // Get axis labels from config (purely cosmetic, don't affect graphing)
  const xAxisLabel = config.xAxisLabel;
  const yAxisLabel = config.yAxisLabel;
  // Get axis variables for hover highlighting (optional)
  const xAxisVar = config.xAxisVar;
  const yAxisVar = config.yAxisVar;
  const xRange = config.xRange || PLOT2D_DEFAULTS.xRange;
  const yRange = config.yRange || PLOT2D_DEFAULTS.yRange;

  // Calculate plot dimensions using helper function
  const { plotWidth, plotHeight, margin } = calculatePlotDimensions(
    width,
    height
  );

  // Get min/max values from ranges
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  // Function to draw the plot
  const drawPlot = useCallback(() => {
    // Guard: computationStore must be available
    if (!computationStore) return;

    // Check if we have graphs early (needed for drag check)
    const hasGraphs = graphs && graphs.length > 0;

    // Only skip redraw during an ACTIVE drag (when both ref and store confirm dragging)
    // This allows redraws when external updates happen (e.g., stopwatch reset) even if
    // a point is in a focused state after a previous interaction
    if (isLocalDragRef.current && computationStore.isDragging) {
      return;
    }
    // Reset stale refs if drag has ended but refs weren't properly cleared
    if (isLocalDragRef.current && !computationStore.isDragging) {
      isLocalDragRef.current = false;
      isDraggingRef.current = false;
    }

    // Clean up any stale global event listeners from previous renders
    if (globalMouseMoveRef.current) {
      document.removeEventListener("mousemove", globalMouseMoveRef.current);
      globalMouseMoveRef.current = null;
    }
    if (globalMouseUpRef.current) {
      document.removeEventListener("mouseup", globalMouseUpRef.current);
      globalMouseUpRef.current = null;
    }

    // Clear focus state only when external drag is happening (formula variable drag)
    // This allows the plot to update freely during external interactions
    // but preserves focus during normal redraws (hover changes, etc.)
    if (hasGraphs && computationStore.isDragging && !isLocalDragRef.current) {
      focusStateRef.current = null;
      isDraggingRef.current = false;
    }

    // Don't full-redraw during standard drag operations to prevent losing the interaction element
    // The 'reaction' below handles live updates via DOM manipulation instead
    // For graphs mode with formula variable drag, we allow redraw to update line and point
    if (computationStore.isDragging && !interaction && !hasGraphs) {
      return;
    }

    if (!svgRef.current) return;

    // Check if we have vectors or graphs
    const hasVectors = vectors && vectors.length > 0;
    if (!hasVectors && !hasGraphs) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG container
    const svg = d3
      .select(svgRef.current)
      .attr("width", plotWidth + margin.left + margin.right)
      .attr("height", plotHeight + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, plotWidth]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([plotHeight, 0]);

    // Get vector variables for enhanced axis hovering
    const vectorVars =
      hasVectors && vectors
        ? getAllVectorVariables(vectors)
        : { allXVariables: [], allYVariables: [] };

    // Add axes using helper function and capture label info
    const labelInfo = addAxes(svg, {
      xScale,
      yScale,
      plotWidth,
      plotHeight,
      margin,
      xLabel: xAxisLabel || "X",
      yLabel: yAxisLabel || "Y",
      xAxis: xAxisVar, // Variable for hover highlighting (optional)
      yAxis: yAxisVar,
      xAxisInterval,
      yAxisInterval,
      xAxisPos,
      yAxisPos,
      xLabelPos,
      yLabelPos,
      allXVariables: vectorVars.allXVariables,
      allYVariables: vectorVars.allYVariables,
    });

    // Store label info in ref for React rendering
    axisLabelInfoRef.current = labelInfo;

    // Add grid using helper function
    addGrid(svg, {
      xScale,
      yScale,
      plotWidth,
      plotHeight,
      margin,
      xGrid,
      yGrid,
      xAxisInterval,
      yAxisInterval,
    });

    if (hasVectors) {
      // Vector mode
      const defs = svg.append("defs");
      renderVectors(
        svg,
        defs,
        vectors as IVector[],
        xScale,
        yScale,
        plotWidth,
        plotHeight,
        computationStore
      );
    }

    // Render graph-based visualizations
    if (hasGraphs) {
      const graphResults = calculateGraphData(graphs, computationStore);

      // Generate unique clipPath id for graph lines
      const graphClipId = `graph-clip-${Math.random().toString(36).slice(2)}`;

      // Create clip path for graph lines
      svg
        .append("defs")
        .append("clipPath")
        .attr("id", graphClipId)
        .append("rect")
        .attr("width", plotWidth)
        .attr("height", plotHeight);

      // Create line generator
      const lineGenerator = d3
        .line<DataPoint>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveLinear);

      // Render graph-based lines
      graphResults.lines.forEach((lineData, index) => {
        if (lineData.points.length > 0) {
          svg
            .append("path")
            .attr("class", `graph-line graph-line-${index}`)
            .datum(lineData.points)
            .attr("fill", "none")
            .attr("stroke", lineData.color)
            .attr("stroke-width", lineData.lineWidth)
            .attr("clip-path", `url(#${graphClipId})`)
            .attr("d", lineGenerator)
            .style("pointer-events", "none");
        }
      });

      // Store point data for rendering after interaction layer
      const graphPointsData = graphResults.points;

      // Add drag interaction for graph-based visualization
      // Find the first line config to use its parameter/interaction for dragging
      const lineConfig = graphs.find((g) => g.type === "line") as
        | I2DLine
        | undefined;

      if (lineConfig) {
        const { parameter, interaction: lineInteraction } = lineConfig;

        // Only set up line drag if line has an interaction property
        const lineHasInteraction = !!lineInteraction;

        // Determine drag mode and variable from line interaction config (only if line has interaction)
        const isVerticalDrag = lineInteraction?.[0] === "vertical-drag";
        const dragVariable = lineInteraction?.[1] || parameter;
        const dragVarConfig = lineHasInteraction
          ? computationStore.variables.get(dragVariable)
          : null;
        const dragRange =
          dragVarConfig?.range ||
          (isVerticalDrag ? [yMin, yMax] : [xMin, xMax]);

        // Create line generator for updating line path during drag
        const lineGenerator = d3
          .line<DataPoint>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
          .curve(d3.curveLinear);

        // Track the point's x-coordinate during drag (for finding point on curve)
        let dragPointX: number | null = null;

        // Track initial values for relative drag (so clicking doesn't cause a jump)
        let dragStartMousePos: number | null = null;
        let dragStartValue: number | null = null;

        // Helper function to update line and point position during drag
        // Updates ALL lines and ALL points since shared variables may affect multiple elements
        const updatePointPosition = () => {
          // Re-sample ALL lines with current variable values (since variables may affect multiple lines)
          const lineConfigs = graphs.filter(
            (g) => g.type === "line"
          ) as I2DLine[];
          const pointConfigs = graphs.filter(
            (g) => g.type === "point"
          ) as I2DPoint[];

          // Cache line points for reuse when updating points
          const linePointsCache: Map<string, DataPoint[]> = new Map();

          lineConfigs.forEach((config, lineIndex) => {
            const {
              range,
              samples = 100,
              parameter: lineParam,
              id: lineGraphId,
            } = config;
            let sampleRange = range;
            if (!sampleRange) {
              const paramVariable = computationStore.variables.get(lineParam);
              sampleRange = paramVariable?.range ?? [xMin, xMax];
            }
            const linePoints = computationStore.sample2DLine(
              lineParam,
              sampleRange,
              samples,
              lineGraphId
            );

            // Cache for point updates
            linePointsCache.set(lineGraphId, linePoints);

            // Update the line path
            if (linePoints.length > 0) {
              svg
                .select(`path.graph-line-${lineIndex}`)
                .attr("d", lineGenerator(linePoints));
            }
          });

          // Determine the focused point index (for tracking dragPointX on the focused point's curve)
          const focusState = focusStateRef.current;
          let focusedPointIndex: number | null = null;
          if (focusState?.type === "point") {
            focusedPointIndex = focusState.index;
          } else if (focusState?.type === "line") {
            // When dragging a line, the associated point is the one we track dragPointX for
            const focusedLineConfig = lineConfigs[focusState.index];
            if (focusedLineConfig) {
              focusedPointIndex = pointConfigs.findIndex(
                (p) => p.id === focusedLineConfig.id
              );
              if (focusedPointIndex < 0) focusedPointIndex = null;
            }
          }

          // Update ALL points (since shared variables may affect multiple points)
          pointConfigs.forEach((pointConfig, pointIndex) => {
            // Get cached line points for this point's associated line
            const linePoints = linePointsCache.get(pointConfig.id) || [];
            let pointOnCurve: DataPoint | null = null;
            // For the focused point, use dragPointX to find position on curve
            // For other points, just run the graph once to get current position
            if (
              pointIndex === focusedPointIndex &&
              dragPointX !== null &&
              linePoints.length > 0
            ) {
              // Find the point on the curve closest to dragPointX
              let closestPoint = linePoints[0];
              let minDist = Math.abs(linePoints[0].x - dragPointX);
              for (const p of linePoints) {
                const dist = Math.abs(p.x - dragPointX);
                if (dist < minDist) {
                  minDist = dist;
                  closestPoint = p;
                }
              }
              pointOnCurve = closestPoint;
            } else {
              // For non-focused points or when not tracking, use current values
              const point = computationStore.sample2DPoint(pointConfig.id);
              if (point) {
                pointOnCurve = point;
                // Initialize dragPointX for focused point if needed
                if (pointIndex === focusedPointIndex && dragPointX === null) {
                  dragPointX = point.x;
                }
              }
            }

            if (!pointOnCurve) {
              return;
            }

            const newCx = xScale(pointOnCurve.x);
            const newCy = yScale(pointOnCurve.y);

            // Update circle and hit area positions
            d3.select(`#graph-point-${pointIndex}`)
              .attr("cx", newCx)
              .attr("cy", newCy);
            d3.select(`#graph-point-hit-${pointIndex}`)
              .attr("cx", newCx)
              .attr("cy", newCy);

            // Hide label during drag for performance (will redraw after drag ends)
            svg
              .select(`rect.graph-point-label-bg-${pointIndex}`)
              .style("display", "none");
            svg
              .select(`text.graph-point-label-${pointIndex}`)
              .style("display", "none");
          });
        };

        // Use refs for state so it persists across re-renders (closure fix)
        let rafId: number | null = null;
        let pendingValue: number | null = null;

        const processDrag = () => {
          if (pendingValue !== null) {
            computationStore.setValue(dragVariable, pendingValue);
            updatePointPosition();
            pendingValue = null;
          }
          rafId = null;
        };

        const scheduleDragUpdate = (value: number) => {
          pendingValue = value;
          if (rafId === null) {
            rafId = requestAnimationFrame(processDrag);
          }
        };

        const endDrag = () => {
          // Always reset isLocalDragRef to ensure reaction tracks variables properly
          // even if isDraggingRef was somehow already false
          const wasDragging = isDraggingRef.current;
          isDraggingRef.current = false;
          isLocalDragRef.current = false;

          if (wasDragging) {
            dragPointX = null; // Reset tracked point position
            dragStartMousePos = null; // Reset relative drag tracking
            dragStartValue = null;
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
            if (pendingValue !== null) {
              computationStore.setValue(dragVariable, pendingValue);
              pendingValue = null;
            }
            computationStore.setDragging(false);
            drawPlot();
          }
        };

        const updateCursors = () => {
          const focusState = focusStateRef.current;

          // Reset all lines and points first
          graphResults.lines.forEach((_, i) => {
            svg
              .select(`path.graph-line-${i}`)
              .attr("stroke-width", 2)
              .attr("filter", null);
          });
          graphPointsData.forEach((_, i) => {
            d3.select(`#graph-point-${i}`).attr("r", 6).attr("filter", null);
            d3.select(`#graph-point-hit-${i}`).style("cursor", "pointer");
          });

          if (focusState?.type === "line" && lineHasInteraction) {
            const lineIndex = focusState.index;
            interactionRect.style(
              "cursor",
              isVerticalDrag ? "ns-resize" : "ew-resize"
            );
            // Add visual indicator for focused line
            svg
              .select(`path.graph-line-${lineIndex}`)
              .attr("stroke-width", 3)
              .attr("filter", "drop-shadow(0 0 3px rgba(59, 130, 246, 0.5))");
          } else if (focusState?.type === "point") {
            const pointIndex = focusState.index;
            interactionRect.style("cursor", "default");
            d3.select(`#graph-point-hit-${pointIndex}`).style("cursor", "grab");
            // Add visual indicator for focused point
            d3.select(`#graph-point-${pointIndex}`)
              .attr("r", 8)
              .attr("filter", "drop-shadow(0 0 4px rgba(59, 130, 246, 0.7))");
          } else {
            // Unfocused - show pointer only if line has interaction, otherwise default
            interactionRect.style(
              "cursor",
              lineHasInteraction ? "pointer" : "default"
            );
          }
        };

        const unfocus = () => {
          focusStateRef.current = null;
          updateCursors();
        };

        // Create interaction rect (rendered first, under points)
        // Only enable pointer events if line has interaction OR any point has interaction
        const anyPointHasInteraction = graphPointsData.some(
          (p) => !!p.interaction
        );
        const interactionRect = svg
          .append("rect")
          .attr("class", "graph-interaction-rect nodrag")
          .attr("width", plotWidth)
          .attr("height", plotHeight)
          .style("fill", "none")
          .style(
            "pointer-events",
            lineHasInteraction || anyPointHasInteraction ? "all" : "none"
          )
          .style("cursor", lineHasInteraction ? "pointer" : "default");

        // Helper to clean up any existing global listeners before adding new ones
        const cleanupGlobalListeners = () => {
          if (globalMouseMoveRef.current) {
            document.removeEventListener(
              "mousemove",
              globalMouseMoveRef.current
            );
            globalMouseMoveRef.current = null;
          }
          if (globalMouseUpRef.current) {
            document.removeEventListener("mouseup", globalMouseUpRef.current);
            globalMouseUpRef.current = null;
          }
        };

        // Global mouse move handler for dragging (only used if line has interaction)
        // Uses relative drag - calculates delta from initial position
        // Maps pixel movement proportionally to the drag variable's range (not axis range)
        const handleGlobalMouseMove = (event: MouseEvent) => {
          if (!isDraggingRef.current || !lineHasInteraction) return;
          if (dragStartMousePos === null || dragStartValue === null) return;
          const svgNode = svg.node();
          if (!svgNode) return;
          const [mouseX, mouseY] = d3.pointer(event, svgNode);

          // Calculate pixel delta and convert to variable range proportionally
          const variableRange = dragRange[1] - dragRange[0];
          let pixelDelta: number;
          let delta: number;

          if (isVerticalDrag) {
            // Vertical: moving up (negative pixel delta) should increase value
            pixelDelta = dragStartMousePos - mouseY;
            // Map pixel movement to variable range (full plot height = full variable range)
            delta = (pixelDelta / plotHeight) * variableRange;
          } else {
            // Horizontal: moving right (positive pixel delta) should increase value
            pixelDelta = mouseX - dragStartMousePos;
            delta = (pixelDelta / plotWidth) * variableRange;
          }

          const newValue = dragStartValue + delta;
          const clampedValue = Math.max(
            dragRange[0],
            Math.min(dragRange[1], newValue)
          );
          scheduleDragUpdate(clampedValue);
        };

        const handleGlobalMouseUp = () => {
          cleanupGlobalListeners();
          if (focusStateRef.current?.type === "point") {
            const pointIndex = focusStateRef.current.index;
            d3.select(`#graph-point-hit-${pointIndex}`).style("cursor", "grab");
          }
          endDrag();
        };

        // Helper to find which line is closest to click position
        // Returns the index of the closest line with interaction, or -1 if none
        const findClosestLine = (mouseX: number, mouseY: number): number => {
          const lineConfigs = graphs.filter(
            (g) => g.type === "line"
          ) as I2DLine[];
          let closestLineIndex = -1;
          let minDistance = Infinity;

          lineConfigs.forEach((config, lineIndex) => {
            // Only consider lines with interaction
            if (!config.interaction) return;

            const {
              range,
              samples = 100,
              parameter: lineParam,
              id: lineGraphId,
            } = config;
            let sampleRange = range;
            if (!sampleRange) {
              const paramVariable = computationStore.variables.get(lineParam);
              sampleRange = paramVariable?.range ?? [xMin, xMax];
            }
            // Get line points
            const linePoints = computationStore.sample2DLine(
              lineParam,
              sampleRange,
              samples,
              lineGraphId
            );

            // Find minimum distance from click to any point on this line
            for (const point of linePoints) {
              const px = xScale(point.x);
              const py = yScale(point.y);
              const dist = Math.sqrt((px - mouseX) ** 2 + (py - mouseY) ** 2);
              if (dist < minDistance) {
                minDistance = dist;
                closestLineIndex = lineIndex;
              }
            }
          });

          // Only return if within a reasonable threshold (e.g., 30 pixels)
          return minDistance < 30 ? closestLineIndex : -1;
        };

        // Interaction rect handles line focus and line dragging (only if line has interaction)
        interactionRect.on("mousedown", (event: MouseEvent) => {
          event.preventDefault();

          // If line doesn't have interaction, only handle unfocusing point
          if (!lineHasInteraction) {
            if (focusStateRef.current?.type === "point") {
              unfocus();
            }
            return;
          }

          const [mouseX, mouseY] = d3.pointer(event);

          if (focusStateRef.current === null) {
            // First click: find and focus the closest line
            const closestLineIndex = findClosestLine(mouseX, mouseY);
            if (closestLineIndex >= 0) {
              focusStateRef.current = { type: "line", index: closestLineIndex };
              updateCursors();
            }
            // If no line is close enough, don't focus anything
          } else if (focusStateRef.current.type === "line") {
            // Check if user clicked on a different line
            const closestLineIndex = findClosestLine(mouseX, mouseY);
            if (
              closestLineIndex >= 0 &&
              closestLineIndex !== focusStateRef.current.index
            ) {
              // Switch focus to the new line
              focusStateRef.current = { type: "line", index: closestLineIndex };
              updateCursors();
              return; // Don't start dragging yet, just switch focus
            }
            // Already focused on line: start dragging
            isDraggingRef.current = true;
            isLocalDragRef.current = true;
            computationStore.setDragging(true);

            // Capture initial mouse position and variable value for relative drag
            // mouseX, mouseY already captured above
            dragStartMousePos = isVerticalDrag ? mouseY : mouseX;
            dragStartValue =
              (computationStore.variables.get(dragVariable)?.value as number) ??
              0;

            // Clean up any stale listeners before adding new ones
            cleanupGlobalListeners();
            // Store references and add listeners
            globalMouseMoveRef.current = handleGlobalMouseMove;
            globalMouseUpRef.current = handleGlobalMouseUp;
            document.addEventListener("mousemove", handleGlobalMouseMove);
            document.addEventListener("mouseup", handleGlobalMouseUp);
            // Don't set value immediately - wait for actual mouse movement
          } else if (focusStateRef.current.type === "point") {
            // Clicking on line area while point is focused: unfocus
            unfocus();
          }
        });

        // Render points ON TOP of interaction rect
        graphPointsData.forEach((pointData, index) => {
          const { point, color, interaction: pointInteraction } = pointData;

          // Only calculate drag config if point has its own interaction
          // Points without interaction are display-only (not draggable)
          const pointIsVerticalDrag = pointInteraction
            ? pointInteraction[0] === "vertical-drag"
            : false;
          const pointDragVariable = pointInteraction ? pointInteraction[1] : "";
          const pointDragVarConfig = pointInteraction
            ? computationStore.variables.get(pointDragVariable)
            : null;
          const pointDragRange =
            pointDragVarConfig?.range ||
            (pointIsVerticalDrag ? [yMin, yMax] : [xMin, xMax]);

          if (
            point.x >= xMin &&
            point.x <= xMax &&
            point.y >= yMin &&
            point.y <= yMax
          ) {
            // Create invisible larger hit area for easier clicking (only if point has interaction)
            const hitArea = svg
              .append("circle")
              .attr("id", `graph-point-hit-${index}`)
              .attr("class", `graph-point-hit graph-point-hit-${index}`)
              .attr("cx", xScale(point.x))
              .attr("cy", yScale(point.y))
              .attr("r", pointInteraction ? 20 : 0) // Large hit area only if interactive
              .attr("fill", "transparent")
              .style("pointer-events", pointInteraction ? "all" : "none")
              .style("cursor", pointInteraction ? "pointer" : "default");

            // Visual point circle (hit area handles clicks)
            svg
              .append("circle")
              .attr("id", `graph-point-${index}`)
              .attr("class", `graph-point graph-point-${index} current-point`)
              .attr("cx", xScale(point.x))
              .attr("cy", yScale(point.y))
              .attr("r", 6)
              .attr("fill", color)
              .attr("stroke", "#fff")
              .attr("stroke-width", 2)
              .style("pointer-events", "none");

            // Point click handler (on hit area for easier clicking) - only if point has interaction
            if (pointInteraction) {
              // Track initial values for relative point drag
              let pointDragStartMousePos: number | null = null;
              let pointDragStartValue: number | null = null;

              // Create point-specific mouse move handler that uses point's interaction config
              // Uses relative drag - calculates delta from initial position
              // For points, use AXIS range so the point visually tracks the mouse position
              // (This differs from line drag which uses variable range for full range access)
              const handlePointMouseMove = (event: MouseEvent) => {
                if (!isDraggingRef.current) return;
                if (
                  pointDragStartMousePos === null ||
                  pointDragStartValue === null
                )
                  return;
                const svgNode = svg.node();
                if (!svgNode) return;
                const [mouseX, mouseY] = d3.pointer(event, svgNode);

                // Calculate pixel delta and convert to AXIS range proportionally
                // This makes the point visually track the mouse position
                const axisRange = pointIsVerticalDrag
                  ? yMax - yMin
                  : xMax - xMin;
                let pixelDelta: number;
                let delta: number;

                if (pointIsVerticalDrag) {
                  // Vertical: moving up (negative pixel delta) should increase value
                  pixelDelta = pointDragStartMousePos - mouseY;
                  delta = (pixelDelta / plotHeight) * axisRange;
                } else {
                  // Horizontal: moving right (positive pixel delta) should increase value
                  pixelDelta = mouseX - pointDragStartMousePos;
                  delta = (pixelDelta / plotWidth) * axisRange;
                }

                const newValue = pointDragStartValue + delta;
                // Still clamp to the variable's range (not axis range) to prevent invalid values
                const clampedValue = Math.max(
                  pointDragRange[0],
                  Math.min(pointDragRange[1], newValue)
                );
                // Update the drag variable and point position
                computationStore.setValue(pointDragVariable, clampedValue);
                // For horizontal drag (changing x-position), update dragPointX
                if (!pointIsVerticalDrag) {
                  dragPointX = clampedValue;
                }
                updatePointPosition();
              };

              const handlePointMouseUp = () => {
                cleanupGlobalListeners();
                // Reset point drag start tracking
                pointDragStartMousePos = null;
                pointDragStartValue = null;
                if (focusStateRef.current?.type === "point") {
                  d3.select(
                    `#graph-point-hit-${focusStateRef.current.index}`
                  ).style("cursor", "grab");
                }
                endDrag();
              };

              hitArea.on("mousedown", (event: MouseEvent) => {
                event.stopPropagation();
                event.preventDefault();

                // Capture the point's x-coordinate for tracking during drag
                dragPointX = point.x;

                // Capture initial mouse position and variable value for relative drag
                const [mouseX, mouseY] = d3.pointer(event, svg.node());
                pointDragStartMousePos = pointIsVerticalDrag ? mouseY : mouseX;
                pointDragStartValue =
                  (computationStore.variables.get(pointDragVariable)
                    ?.value as number) ?? 0;

                if (
                  focusStateRef.current === null ||
                  focusStateRef.current?.type === "line"
                ) {
                  // First click or switching from line: focus this point AND prepare for drag
                  focusStateRef.current = { type: "point", index };
                  updateCursors();

                  // Start drag immediately so user can click-and-drag in one motion
                  isDraggingRef.current = true;
                  isLocalDragRef.current = true;
                  computationStore.setDragging(true);
                  hitArea.style("cursor", "grabbing");

                  // Clean up any stale listeners before adding new ones
                  cleanupGlobalListeners();
                  // Store references and add listeners
                  globalMouseMoveRef.current = handlePointMouseMove;
                  globalMouseUpRef.current = handlePointMouseUp;
                  document.addEventListener("mousemove", handlePointMouseMove);
                  document.addEventListener("mouseup", handlePointMouseUp);
                  // Don't set value immediately - wait for actual mouse movement
                } else if (focusStateRef.current?.type === "point") {
                  // Already focused on a point: focus this point and start dragging
                  focusStateRef.current = { type: "point", index };
                  updateCursors();

                  isDraggingRef.current = true;
                  isLocalDragRef.current = true;
                  computationStore.setDragging(true);
                  hitArea.style("cursor", "grabbing");

                  // Clean up any stale listeners before adding new ones
                  cleanupGlobalListeners();
                  // Store references and add listeners
                  globalMouseMoveRef.current = handlePointMouseMove;
                  globalMouseUpRef.current = handlePointMouseUp;
                  document.addEventListener("mousemove", handlePointMouseMove);
                  document.addEventListener("mouseup", handlePointMouseUp);
                  // Don't set value immediately - wait for actual mouse movement
                }
              });
            }

            // Add label with background if enabled
            if (pointData.showLabel) {
              const labelX = xScale(point.x) + 10;
              const labelY = yScale(point.y) - 10;
              const labelText = `x: ${point.x.toFixed(2)}, y: ${point.y.toFixed(2)}`;

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
                const rectHeight = bbox.height + 8;
                const rectY = labelY - bbox.height - 4;
                const centeredTextY = rectY + rectHeight / 2 + bbox.height / 3;

                svg
                  .append("rect")
                  .attr(
                    "class",
                    `graph-point-label-bg graph-point-label-bg-${index}`
                  )
                  .attr("x", labelX - 8)
                  .attr("y", rectY)
                  .attr("width", bbox.width + 16)
                  .attr("height", rectHeight)
                  .attr("fill", "white")
                  .attr("stroke", "#e2e8f0")
                  .attr("stroke-width", 1)
                  .attr("rx", 6);

                svg
                  .append("text")
                  .attr("class", `graph-point-label graph-point-label-${index}`)
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
          }
        });

        // Restore visual focus state after re-render (if focus was maintained)
        if (focusStateRef.current !== null) {
          updateCursors();
        }
      } else {
        // No line config - render points without interaction
        graphPointsData.forEach((pointData, index) => {
          const { point, color } = pointData;

          if (
            point.x >= xMin &&
            point.x <= xMax &&
            point.y >= yMin &&
            point.y <= yMax
          ) {
            svg
              .append("circle")
              .attr("class", `graph-point graph-point-${index} current-point`)
              .attr("cx", xScale(point.x))
              .attr("cy", yScale(point.y))
              .attr("r", 6)
              .attr("fill", color)
              .attr("stroke", "#fff")
              .attr("stroke-width", 2);

            if (pointData.showLabel) {
              const labelX = xScale(point.x) + 10;
              const labelY = yScale(point.y) - 10;
              const labelText = `x: ${point.x.toFixed(2)}, y: ${point.y.toFixed(2)}`;

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
                const rectHeight = bbox.height + 8;
                const rectY = labelY - bbox.height - 4;
                const centeredTextY = rectY + rectHeight / 2 + bbox.height / 3;

                svg
                  .append("rect")
                  .attr(
                    "class",
                    `graph-point-label-bg graph-point-label-bg-${index}`
                  )
                  .attr("x", labelX - 8)
                  .attr("y", rectY)
                  .attr("width", bbox.width + 16)
                  .attr("height", rectHeight)
                  .attr("fill", "white")
                  .attr("stroke", "#e2e8f0")
                  .attr("stroke-width", 1)
                  .attr("rx", 6);

                svg
                  .append("text")
                  .attr("class", `graph-point-label graph-point-label-${index}`)
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
          }
        });
      }

      // Render accumulated step points (points with stepId that collect from multiple steps)
      stepPoints.forEach(({ config, accumulatedPoints }, stepPointIndex) => {
        const { color, size = 6 } = config;

        accumulatedPoints.forEach((pt, ptIndex) => {
          if (pt.x >= xMin && pt.x <= xMax && pt.y >= yMin && pt.y <= yMax) {
            svg
              .append("circle")
              .attr(
                "class",
                `step-point step-point-${stepPointIndex}-${ptIndex}`
              )
              .attr("cx", xScale(pt.x))
              .attr("cy", yScale(pt.y))
              .attr("r", size)
              .attr("fill", color)
              .attr("stroke", "#fff")
              .attr("stroke-width", 2)
              .attr("opacity", 0.9);
          }
        });
      });
    }

    // Note: Hover lines for variables removed - labels are now purely cosmetic
  }, [
    vectors,
    graphs,
    plotWidth,
    plotHeight,
    margin,
    xMin,
    xMax,
    yMin,
    yMax,
    xAxisLabel,
    yAxisLabel,
    xAxisVar,
    yAxisVar,
    xLabelPos,
    yLabelPos,
    xAxisInterval,
    yAxisInterval,
    xAxisPos,
    yAxisPos,
    xGrid,
    yGrid,
    interaction,
    computationStore,
  ]);

  // Set up reaction to re-render when any variable changes
  useEffect(() => {
    // Guard: computationStore must be available
    if (!computationStore) return;

    const hasGraphs = graphs && graphs.length > 0;

    const disposer = reaction(
      () => {
        // ALWAYS track all variables to maintain proper MobX dependency tracking
        // This ensures the reaction fires when any variable changes, even after local drag ends
        const allVariables: Record<string, number | boolean | string> = {};
        for (const [id, variable] of computationStore.variables.entries()) {
          const value = variable.value;
          allVariables[id] = typeof value === "number" ? value : 0;
        }

        // Always track isDragging for proper state management
        allVariables._isDragging = computationStore.isDragging;
        // Track step state for step-dependent point visibility
        allVariables._stepping = computationStore.stepping;
        allVariables._currentStepIndex = computationStore.currentStepIndex;
        allVariables._stepsLength = computationStore.steps.length;
        // Include local drag state as a marker (not for MobX tracking, just for effect logic)
        // We read the ref here to include it in the returned data
        const localDragActive = isLocalDragRef.current;
        return { ...allVariables, _isLocalDrag: localDragActive };
      },
      (data: Record<string, unknown>) => {
        const isLocalDrag = data._isLocalDrag as boolean;
        const isDragging = data._isDragging as boolean;

        // During active local drag, skip redraw - DOM manipulation handles updates
        if (isLocalDrag && isDragging) {
          return;
        }

        // If local drag just ended (marker says local but store says not dragging),
        // ensure refs are reset
        if (isLocalDrag && !isDragging) {
          isLocalDragRef.current = false;
          isDraggingRef.current = false;
        }

        // Safeguard: If local drag ref is stuck true but computationStore says we're not dragging,
        // this is an inconsistent state (e.g., mouseup was missed). Reset it.
        if (isLocalDragRef.current && !computationStore.isDragging) {
          isLocalDragRef.current = false;
          isDraggingRef.current = false;
        }

        // Re-render if not dragging OR if using custom interaction OR if using graphs
        const shouldDraw =
          !computationStore.isDragging || interaction || hasGraphs;
        if (shouldDraw) {
          drawPlot();
        }
      },
      { fireImmediately: true }
    );

    return () => disposer();
  }, [drawPlot, interaction, graphs, computationStore]);

  // Clean up global event listeners on unmount
  useEffect(() => {
    return () => {
      if (globalMouseMoveRef.current) {
        document.removeEventListener("mousemove", globalMouseMoveRef.current);
      }
      if (globalMouseUpRef.current) {
        document.removeEventListener("mouseup", globalMouseUpRef.current);
      }
    };
  }, []);

  // Re-draw when config changes
  useEffect(() => {
    drawPlot();
  }, [config, drawPlot]);

  // Guard: computationStore must be provided - placed after all hooks
  if (!computationStore) {
    return <div className="plot2d-loading">Loading plot...</div>;
  }

  return (
    <div className="formulize-plot2d" style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
          overflow: "visible",
        }}
      />
      <AxisLabels
        labelInfo={axisLabelInfoRef.current}
        xAxisHovered={
          xAxisVar
            ? computationStore.hoverStates.get(xAxisVar) || false
            : axisLabelInfoRef.current.xLabel?.allXVariables.some((varId) =>
                computationStore.hoverStates.get(varId)
              ) || false
        }
        yAxisHovered={
          yAxisVar
            ? computationStore.hoverStates.get(yAxisVar) || false
            : axisLabelInfoRef.current.yLabel?.allYVariables.some((varId) =>
                computationStore.hoverStates.get(varId)
              ) || false
        }
      />
      <div ref={tooltipRef} className="tooltip" />
    </div>
  );
});

export default Plot2D;
