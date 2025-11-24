import * as d3 from "d3";

import { computationStore } from "../../store/computation";
import { type ILine } from "../../types/plot2d";
import { getVariableValue } from "../../util/computation-helpers";
import { addCurrentPointHighlight, addInteractions } from "./interaction";

export interface DataPoint {
  x: number;
  y: number;
}

/**
 * Function to calculate data points for a specific line
 */
function calculateLineDataPoints(
  xAxis: string,
  yAxis: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): DataPoint[] {
  const points: DataPoint[] = [];

  // Get current variable values
  const allVariables: Record<string, number> = {};
  for (const [id, variable] of computationStore.variables.entries()) {
    const value = variable.value;
    allVariables[id] = typeof value === "number" ? value : 0;
  }

  // Try to get evaluation function from store
  const debugState = computationStore.getDebugState();
  if (!debugState.hasFunction) return [];
  const evalFunction = computationStore.evaluateFormula;
  if (!evalFunction) return [];

  // Allow points slightly outside the visible range for smooth clipping
  // This prevents huge coordinate values while maintaining visual continuity
  const yRangeSize = yMax - yMin;
  const yBuffer = yRangeSize * 1.5; // Allow 1.5x range on each side for asymptotes
  const yMinExtended = yMin - yBuffer;
  const yMaxExtended = yMax + yBuffer;

  // For asymptotic curves, avoid exact zero which often causes singularities
  const epsilon = (xMax - xMin) * 0.001;
  const effectiveXMin = xMin === 0 ? epsilon : xMin;

  for (let i = 0; i <= 100; i++) {
    const x = effectiveXMin + i * ((xMax - effectiveXMin) / 100);
    try {
      const vars = { ...allVariables, [xAxis]: x };
      const result = evalFunction(vars);
      let y = result[yAxis];

      if (typeof y === "number") {
        // Handle infinity by clamping to extended range (for asymptotes)
        if (y === Infinity || y > yMaxExtended) {
          y = yMaxExtended;
        } else if (y === -Infinity || y < yMinExtended) {
          y = yMinExtended;
        }

        // Include the point if it's a valid number
        if (isFinite(y)) {
          points.push({ x, y });
        }
      }
    } catch (error) {
      // Skip invalid points
    }
  }

  return points;
}

/**
 * Renders multiple lines on the SVG
 */
export function renderLines(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  tooltipRef: React.RefObject<HTMLDivElement>,
  lines: ILine[],
  xAxis: string,
  yAxis: string,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xRange: [number, number],
  yRange: [number, number],
  plotWidth: number,
  plotHeight: number,
  onDragEnd?: () => void,
  interaction?: ["horizontal-drag" | "vertical-drag", string]
): void {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  // Generate unique clipPath id to avoid collisions between multiple plot instances
  const clipId = `plot-clip-${Math.random().toString(36).slice(2)}`;

  // Create clip path to hide lines outside plot area
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", plotWidth)
    .attr("height", plotHeight);

  // Create line generator with linear interpolation for accuracy
  const lineGenerator = d3
    .line<DataPoint>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))
    .curve(d3.curveLinear); // Linear interpolation - no smoothing

  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
  ];

  const firstLinePoints: DataPoint[] = [];

  lines.forEach((lineConfig, index) => {
    const points = calculateLineDataPoints(
      xAxis,
      yAxis,
      xMin,
      xMax,
      yMin,
      yMax
    );

    if (points.length > 0) {
      if (index === 0) {
        firstLinePoints.push(...points);
      }

      const color = lineConfig.color || colors[index % colors.length];
      const lineWidth = lineConfig.lineWidth || 2;

      // Add the line path with clipping
      svg
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", lineWidth)
        .attr("clip-path", `url(#${clipId})`)
        .attr("d", lineGenerator)
        .style("pointer-events", "none"); // Ensure line doesn't block interactions

      // Add current point highlight for each line (only if not using custom interaction)
      if (!interaction) {
        const currentX = getVariableValue(xAxis);
        const currentY = getVariableValue(yAxis);
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
          xAxis,
          yAxis
        );
      }
    }
  });

  // Add interactions layer ON TOP of all lines
  if (firstLinePoints.length > 0) {
    addInteractions(
      svg,
      tooltipRef,
      firstLinePoints, // Use points from first line for snapping
      xScale,
      yScale,
      plotWidth,
      plotHeight,
      xAxis,
      yAxis,
      onDragEnd,
      interaction
    );
  }
}
