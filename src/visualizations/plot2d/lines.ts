import * as d3 from "d3";

import { computationStore } from "../../api/computation";
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
  xVar: string,
  yVar: string,
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
}

/**
 * Renders multiple lines on the SVG
 */
export function renderLines(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  tooltipRef: React.RefObject<HTMLDivElement>,
  lines: ILine[],
  xVar: string,
  yVar: string,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xRange: [number, number],
  yRange: [number, number],
  plotWidth: number,
  plotHeight: number,
  onDragEnd?: () => void
): void {
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  // Create line generator
  const lineGenerator = d3
    .line<DataPoint>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y))
    .curve(d3.curveBasis);

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
    const points = calculateLineDataPoints(xVar, yVar, xMin, xMax, yMin, yMax);

    if (points.length > 0) {
      const color = lineConfig.color || colors[index % colors.length];
      const lineWidth = lineConfig.lineWidth || 2;

      // Add the line path
      svg
        .append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", lineWidth)
        .attr("d", lineGenerator);

      // Add current point highlight for each line
      const currentX = getVariableValue(xVar);
      const currentY = getVariableValue(yVar);
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
          xVar,
          yVar,
          onDragEnd
        );
      }
    }
  });
}
