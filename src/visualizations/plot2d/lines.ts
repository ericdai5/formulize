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
  xAxisVar: string,
  yAxisVar: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): DataPoint[] {
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

  // Allow points slightly outside the visible range for smooth clipping
  // This prevents huge coordinate values while maintaining visual continuity
  const yRange = yMax - yMin;
  const yBuffer = yRange * 1.1; // Allow 1.1x range on each side
  const yMinExtended = yMin - yBuffer;
  const yMaxExtended = yMax + yBuffer;

  for (let i = 0; i <= 100; i++) {
    const x = xMin + i * step;
    try {
      const vars = { ...allVariables, [xAxisVar]: x };
      const result = evalFunction(vars);
      const y = result[yAxisVar];
      // Include points within extended range - SVG clip-path will handle exact clipping
      if (
        typeof y === "number" &&
        isFinite(y) &&
        y >= yMinExtended &&
        y <= yMaxExtended
      ) {
        points.push({ x, y });
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
  xAxisVar: string,
  yAxisVar: string,
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

  lines.forEach((lineConfig, index) => {
    const points = calculateLineDataPoints(
      xAxisVar,
      yAxisVar,
      xMin,
      xMax,
      yMin,
      yMax
    );

    if (points.length > 0) {
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
        .attr("d", lineGenerator);

      // Add current point highlight for each line (only if not using custom interaction)
      if (!interaction) {
        const currentX = getVariableValue(xAxisVar);
        const currentY = getVariableValue(yAxisVar);
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
          xAxisVar,
          yAxisVar
        );
      }

      // Add interactions for the first line (to avoid conflicts)
      if (index === 0) {
        addInteractions(
          svg,
          tooltipRef,
          points,
          xScale,
          yScale,
          plotWidth,
          plotHeight,
          xAxisVar,
          yAxisVar,
          onDragEnd,
          interaction
        );
      }
    }
  });
}
