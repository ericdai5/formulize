import React, { useCallback, useEffect, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import * as d3 from "d3";

import { computationStore } from "../../api/computation";
import { type IPlot2D } from "../../types/plot2d";
import { type IVector } from "../../types/plot2d";
import { getVariableValue } from "../../util/computation-helpers";
import { addAxes, addGrid } from "./axes";
import { PLOT2D_DEFAULTS } from "./defaults";
import { addCurrentPointHighlight, addInteractions } from "./interaction";
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

  // Simple function to calculate traditional plot data points
  const calculateTraditionalDataPoints = useCallback(() => {
    if (!xVar || !yVar) return [];

    const points: DataPoint[] = [];
    const step = (xMax - xMin) / 100; // 100 points for smooth curve

    // Get current variable values
    const allVariables: Record<string, number> = {};
    for (const [id, variable] of computationStore.variables.entries()) {
      allVariables[id] = variable.value ?? 0;
    }

    // Try to get evaluation function from store
    const debugState = computationStore.getDebugState();
    if (!debugState.hasFunction) return [];

    const evalFunction = computationStore.evaluateFormula;
    if (!evalFunction) return [];

    for (let i = 0; i <= 100; i++) {
      const x = xMin + i * step;
      try {
        const vars = { ...allVariables, [xVar]: x };
        const result = evalFunction(vars);
        const y = result[yVar];

        if (typeof y === "number" && isFinite(y) && y >= yMin && y <= yMax) {
          points.push({ x, y });
        }
      } catch (error) {
        // Skip invalid points
      }
    }

    return points;
  }, [xVar, yVar, xMin, xMax, yMin, yMax]);

  // Function to draw the plot
  const drawPlot = useCallback(() => {
    if (!svgRef.current) return;

    // Check if we have vectors (vector mode) or traditional plotting
    const hasVectors = vectors && vectors.length > 0;
    const hasTraditional = xVar && yVar && !hasVectors;

    if (!hasVectors && !hasTraditional) return;

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
      xLabel: hasTraditional ? getVariableLabel(xVar!) : "X",
      yLabel: hasTraditional ? getVariableLabel(yVar!) : "Y",
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
    } else if (hasTraditional) {
      // Traditional plotting mode (algebra examples)
      const points = calculateTraditionalDataPoints();

      if (points.length > 0) {
        // Create line generator
        const line = d3
          .line<DataPoint>()
          .x((d) => xScale(d.x))
          .y((d) => yScale(d.y))
          .curve(d3.curveBasis);

        // Add the line path
        svg
          .append("path")
          .datum(points)
          .attr("fill", "none")
          .attr("stroke", "#3b82f6")
          .attr("stroke-width", 3)
          .attr("d", line);

        // Add current point highlight
        const currentX = getVariableValue(xVar!);
        const currentY = getVariableValue(yVar!);
        const currentPointData = {
          x:
            typeof currentX === "number"
              ? currentX
              : parseFloat(String(currentX)) || 0,
          y:
            typeof currentY === "number"
              ? currentY
              : parseFloat(String(currentY)) || 0,
        };

        addCurrentPointHighlight(
          svg,
          currentPointData,
          xScale,
          yScale,
          [xMin, xMax],
          [yMin, yMax],
          xVar,
          yVar
        );

        // Add interactions
        addInteractions(
          svg,
          tooltipRef,
          points,
          xScale,
          yScale,
          plotWidth,
          plotHeight,
          xVar,
          yVar
        );
      }
    }
  }, [
    vectors,
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
        // Track all variable values for live updates
        const allVariables: Record<string, number> = {};
        for (const [id, variable] of computationStore.variables.entries()) {
          allVariables[id] = variable.value ?? 0;
        }
        return allVariables;
      },
      () => {
        // Force re-render when variables change
        drawPlot();
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
