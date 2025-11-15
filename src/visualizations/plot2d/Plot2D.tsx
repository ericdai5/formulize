import React, { useCallback, useEffect, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import * as d3 from "d3";

import { computationStore } from "../../store/computation";
import { type IPlot2D, type IVector } from "../../types/plot2d";
import { AxisLabels } from "./AxisLabels";
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

  // Parse configuration options with defaults
  const {
    xAxisVar,
    xRange = PLOT2D_DEFAULTS.xRange,
    xAxisInterval,
    xAxisPos,
    xLabelPos,
    xGrid = "show",
    yAxisVar,
    yRange = PLOT2D_DEFAULTS.yRange,
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
    if (!svgRef.current) return;

    // Check if we have vectors or lines
    const hasVectors = vectors && vectors.length > 0;
    const hasLines = lines && lines.length > 0 && xAxisVar && yAxisVar;

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
      xLabel: hasLines && xAxisVar ? xAxisVar : "X",
      yLabel: hasLines && yAxisVar ? yAxisVar : "Y",
      xAxisVar: hasLines ? xAxisVar : undefined,
      yAxisVar: hasLines ? yAxisVar : undefined,
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
        xAxisVar!,
        yAxisVar!,
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
    if (hasLines && (xAxisVar || yAxisVar)) {
      updateHoverLines({
        svg,
        xScale,
        yScale,
        plotWidth,
        plotHeight,
        xAxisVar,
        yAxisVar,
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
        xAxisVarHovered={
          xAxisVar
            ? computationStore.hoverStates.get(xAxisVar) || false
            : axisLabelInfoRef.current.xLabel?.allXVariables.some((varId) =>
                computationStore.hoverStates.get(varId)
              ) || false
        }
        yAxisVarHovered={
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
