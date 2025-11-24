import React, { useCallback, useEffect, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import * as d3 from "d3";

import { computationStore } from "../../store/computation";
import { type IPlot2D, type IVector } from "../../types/plot2d";
import { AxisLabels } from "./AxisLabels";
import { autoDetectPlotConfig } from "./auto-detect";
import { type AxisLabelInfo, addAxes, addGrid } from "./axes";
import { PLOT2D_DEFAULTS } from "./defaults";
import { updateHoverLines } from "./hover-lines";
import { renderLines } from "./lines";
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
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const axisLabelInfoRef = useRef<AxisLabelInfo>({});

  // Auto-detect axes and ranges if not provided
  const autoDetected = autoDetectPlotConfig(config);

  // Parse configuration options with defaults (using auto-detected values)
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
    lines,
    width = PLOT2D_DEFAULTS.width,
    height = PLOT2D_DEFAULTS.height,
    interaction,
  } = config;

  // Use auto-detected or config-specified values
  const xAxis = config.xAxis || autoDetected.xAxis;
  const yAxis = config.yAxis || autoDetected.yAxis;
  const xRange = config.xRange || autoDetected.xRange;
  const yRange = config.yRange || autoDetected.yRange;

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
    // Don't full-redraw during standard drag operations to prevent losing the interaction element
    // The 'reaction' below handles live updates via DOM manipulation instead
    if (computationStore.isDragging && !interaction) return;

    if (!svgRef.current) return;

    // Check if we have vectors or lines
    const hasVectors = vectors && vectors.length > 0;
    const hasLines = lines && lines.length > 0 && xAxis && yAxis;

    if (!hasVectors && !hasLines) return;

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
        plotHeight
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
      });
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
  ]);

  // Set up reaction to re-render when any variable changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        // Only skip tracking during default dragging (not custom interaction)
        if (computationStore.isDragging && !interaction) return null;

        // Track all variable values and hover states for live updates
        const allVariables: Record<string, number | boolean> = {};
        for (const [id, variable] of computationStore.variables.entries()) {
          const value = variable.value;
          allVariables[id] = typeof value === "number" ? value : 0;
          allVariables[`${id}_hover`] =
            computationStore.hoverStates.get(id) || false;
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
  }, [drawPlot, interaction]);

  // Re-draw when config changes
  useEffect(() => {
    drawPlot();
  }, [config, drawPlot]);

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
