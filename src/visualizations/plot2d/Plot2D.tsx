import React, { useCallback, useEffect, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import * as d3 from "d3";

import { computationStore } from "../../store/computation";
import { type IPlot2D, type IVector } from "../../types/plot2d";
import { addAxes, addGrid } from "./axes";
import { PLOT2D_DEFAULTS } from "./defaults";
import { updateHoverLines } from "./hover-lines";
import { renderLines } from "./lines";
import { calculatePlotDimensions, getVariableLabel } from "./utils";
import { renderVectors } from "./vectors";

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

  // Parse configuration options with defaults
  const {
    xVar,
    xRange = PLOT2D_DEFAULTS.xRange,
    yVar,
    yRange = PLOT2D_DEFAULTS.yRange,
    vectors,
    lines,
    width = PLOT2D_DEFAULTS.width,
    height = PLOT2D_DEFAULTS.height,
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
    const hasLines = lines && lines.length > 0 && xVar && yVar;

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

    // Add axes using helper function
    addAxes(svg, {
      xScale,
      yScale,
      plotWidth,
      plotHeight,
      margin,
      xLabel: hasLines && xVar ? getVariableLabel(xVar) : "X",
      yLabel: hasLines && yVar ? getVariableLabel(yVar) : "Y",
      xVar: hasLines ? xVar : undefined,
      yVar: hasLines ? yVar : undefined,
      xVarHovered: hasLines && xVar ? computationStore.variables.get(xVar)?.hover || false : false,
      yVarHovered: hasLines && yVar ? computationStore.variables.get(yVar)?.hover || false : false,
    });

    // Add grid using helper function
    addGrid(svg, {
      xScale,
      yScale,
      plotWidth,
      plotHeight,
      margin,
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
        xVar!,
        yVar!,
        xScale,
        yScale,
        [xMin, xMax],
        [yMin, yMax],
        plotWidth,
        plotHeight,
        drawPlot
      );
    }

    // Add hover lines for x/y variables
    if (hasLines && (xVar || yVar)) {
      updateHoverLines({
        svg,
        xScale,
        yScale,
        plotWidth,
        plotHeight,
        xVar,
        yVar,
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
    xVar,
    yVar,
  ]);

  // Set up reaction to re-render when any variable changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        // Skip tracking during dragging to prevent re-renders
        if (computationStore.isDragging) return null;

        // Track all variable values and hover states for live updates
        const allVariables: Record<string, number | boolean> = {};
        for (const [id, variable] of computationStore.variables.entries()) {
          allVariables[id] = variable.value ?? 0;
          allVariables[`${id}_hover`] = variable.hover;
        }
        return allVariables;
      },
      () => {
        // Only re-render if not dragging
        if (!computationStore.isDragging) {
          drawPlot();
        }
      },
      { fireImmediately: true }
    );

    return () => disposer();
  }, [drawPlot]);

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
      <div ref={tooltipRef} className="tooltip" />
    </div>
  );
});

export default Plot2D;
