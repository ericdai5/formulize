import React, { useCallback, useEffect, useMemo, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import * as d3 from "d3";

import { useFormulize } from "../../core/hooks";
import { type IPlot2D, type IVector } from "../../types/plot2d";
import { AxisLabels } from "./axis-labels";
import { autoDetectPlotConfig } from "./auto-detect";
import { type AxisLabelInfo, addAxes, addGrid } from "./axes";
import { PLOT2D_DEFAULTS } from "./defaults";
import { updateHoverLines } from "./hover-lines";
import { renderLines } from "./lines";
import { STEP_POINTS_EXTENSION_KEY, StepPointsRenderer } from "./step-points";
import { calculatePlotDimensions } from "./utils";
import { getAllVectorVariables, renderVectors } from "./vectors";

interface Plot2DProps {
  config: IPlot2D;
}

export interface DataPoint {
  x: number;
  y: number;
}

const Plot2D: React.FC<Plot2DProps> = observer(({ config }) => {
  const context = useFormulize();
  const computationStore = context?.computationStore;
  const executionStore = context?.executionStore;
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const axisLabelInfoRef = useRef<AxisLabelInfo>({});
  const stepPointsRendererRef = useRef<StepPointsRenderer>(
    new StepPointsRenderer()
  );

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
    width = PLOT2D_DEFAULTS.width,
    height = PLOT2D_DEFAULTS.height,
    interaction,
    stepPoints,
  } = config;

  // If lines is not provided, default to a single line
  // This allows users to just specify xAxis/yAxis without explicitly defining lines
  const lines = useMemo(() => config.lines || [{}], [config.lines]);

  // Memoize auto-detected config and derived values
  const { xAxis, yAxis, xRange, yRange } = useMemo(() => {
    if (!computationStore) {
      // Return defaults when computationStore is not available
      return {
        xAxis: config.xAxis || "",
        yAxis: config.yAxis || "",
        xRange: config.xRange || ([-10, 10] as [number, number]),
        yRange: config.yRange || ([-10, 10] as [number, number]),
      };
    }
    const autoDetected = autoDetectPlotConfig(config, computationStore);
    return {
      xAxis: config.xAxis || autoDetected.xAxis,
      yAxis: config.yAxis || autoDetected.yAxis,
      xRange: config.xRange || autoDetected.xRange,
      yRange: config.yRange || autoDetected.yRange,
    };
  }, [config, computationStore]);

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

    // Don't full-redraw during standard drag operations to prevent losing the interaction element
    // The 'reaction' below handles live updates via DOM manipulation instead
    if (computationStore.isDragging && !interaction) return;

    if (!svgRef.current) return;

    // Check if we have vectors or lines
    const hasVectors = vectors && vectors.length > 0;
    const hasLines = xAxis && yAxis && lines.length > 0;
    const hasStepPoints = !!stepPoints && !!executionStore;
    if (!hasVectors && !hasLines && !hasStepPoints) return;

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
      xLabel: hasLines && xAxis ? xAxis : "X",
      yLabel: hasLines && yAxis ? yAxis : "Y",
      xAxis: hasLines ? xAxis : undefined,
      yAxis: hasLines ? yAxis : undefined,
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
    } else if (hasLines) {
      // Multiple lines mode
      renderLines(
        svg,
        tooltipRef,
        lines,
        xAxis!,
        yAxis!,
        xScale,
        yScale,
        [xMin, xMax],
        [yMin, yMax],
        plotWidth,
        plotHeight,
        computationStore,
        drawPlot,
        interaction
      );
    }

    // Add hover lines for x/y variables
    if (hasLines && (xAxis || yAxis)) {
      updateHoverLines({
        svg,
        xScale,
        yScale,
        plotWidth,
        plotHeight,
        xAxis,
        yAxis,
        computationStore,
      });
    }

    // Render step points from extensions (values resolved in useEffect)
    if (stepPoints && executionStore) {
      stepPointsRendererRef.current.render(
        svg,
        xScale,
        yScale,
        [xMin, xMax],
        [yMin, yMax],
        executionStore
      );
    }
  }, [
    vectors,
    lines,
    plotWidth,
    plotHeight,
    margin,
    xMin,
    xMax,
    yMin,
    yMax,
    xAxis,
    yAxis,
    xLabelPos,
    yLabelPos,
    xAxisInterval,
    yAxisInterval,
    xAxisPos,
    yAxisPos,
    xGrid,
    yGrid,
    interaction,
    stepPoints,
    computationStore,
    executionStore,
  ]);

  // Set up reaction to re-render when any variable changes
  useEffect(() => {
    // Guard: computationStore must be available
    if (!computationStore) return;

    const disposer = reaction(
      () => {
        // Only skip tracking during default dragging (not custom interaction)
        if (computationStore.isDragging && !interaction) return null;

        // Track all variable values and hover states for live updates
        const allVariables: Record<string, number | boolean | string> = {};
        for (const [id, variable] of computationStore.variables.entries()) {
          const value = variable.value;
          allVariables[id] = typeof value === "number" ? value : 0;
          allVariables[`${id}_hover`] =
            computationStore.hoverStates.get(id) || false;
        }

        // Also track active variables and history index if execution store exists
        if (executionStore) {
          // Serialize activeVariables Map for change detection
          allVariables._activeVars = Array.from(
            executionStore.activeVariables.entries()
          )
            .map(([formulaId, varSet]) => `${formulaId}:${Array.from(varSet).join(",")}`)
            .join(";");
          // Track historyIndex to re-render when stepping through history
          allVariables._historyIndex = executionStore.historyIndex;
        }

        return allVariables;
      },
      () => {
        // Re-render if not dragging OR if using custom interaction
        if (!computationStore.isDragging || interaction) {
          drawPlot();
        }
      },
      { fireImmediately: true }
    );

    return () => disposer();
  }, [drawPlot, interaction, computationStore, executionStore]);

  // Re-draw when config changes
  useEffect(() => {
    drawPlot();
  }, [config, drawPlot]);

  // Re-draw when execution store resets (step points are managed by the system)
  useEffect(() => {
    if (!executionStore) return;
    const disposer = reaction(
      () => executionStore.resetCount,
      () => {
        drawPlot();
      },
      { fireImmediately: true }
    );
    return () => disposer();
  }, [executionStore, drawPlot]);

  // Register step points by resolving variable names from step.variables
  useEffect(() => {
    if (!stepPoints || !executionStore || executionStore.history.length === 0) {
      return;
    }

    const items: Array<{
      viewId: string;
      index?: number;
      persistence?: boolean;
      data: Record<string, unknown>;
    }> = [];

    for (const [viewId, pointsConfig] of Object.entries(stepPoints)) {
      const pointsArray = Array.isArray(pointsConfig)
        ? pointsConfig
        : [pointsConfig];

      for (const pointConfig of pointsArray) {
        // Iterate ALL steps to find each occurrence of this viewId
        for (let i = 0; i < executionStore.history.length; i++) {
          const step = executionStore.history[i];
          if (step.step?.id !== viewId) continue;

          const xValue = step.variables[pointConfig.xValue];
          const yValue = step.variables[pointConfig.yValue];

          if (typeof xValue !== "number" || typeof yValue !== "number") {
            continue;
          }

          items.push({
            viewId,
            index: i,
            persistence: pointConfig.persistence,
            data: {
              xValue,
              yValue,
              color: pointConfig.color,
              size: pointConfig.size,
              label: pointConfig.label,
            },
          });
        }
      }
    }

    if (items.length > 0) {
      executionStore.addObject({
        key: STEP_POINTS_EXTENSION_KEY,
        items,
      });
    }
  }, [stepPoints, executionStore, executionStore?.history.length, executionStore?.resetCount]);

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
          xAxis
            ? computationStore.hoverStates.get(xAxis) || false
            : axisLabelInfoRef.current.xLabel?.allXVariables.some((varId) =>
                computationStore.hoverStates.get(varId)
              ) || false
        }
        yAxisHovered={
          yAxis
            ? computationStore.hoverStates.get(yAxis) || false
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
