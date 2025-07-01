import * as d3 from "d3";
import { runInAction } from "mobx";
import { computationStore } from "../../api/computation";
import { formatVariableValue, getVariableLabel } from "./utils";

import type { DataPoint } from "./Plot2D";

/**
 * Adds interactive tooltip and hover functionality to the plot
 */
export function addInteractions(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  tooltipRef: React.RefObject<HTMLDivElement>,
  dataPoints: DataPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  plotWidth: number,
  plotHeight: number,
  xVar?: string,
  yVar?: string
): void {
  if (!xVar || !yVar || dataPoints.length === 0) return;

  // Add invisible overlay for hover interaction
  const focus = svg
    .append("g")
    .attr("class", "focus")
    .style("display", "none");

  focus.append("circle").attr("r", 5).attr("fill", "#3b82f6");

  // Create tooltip
  const tooltip = d3
    .select(tooltipRef.current)
    .attr("class", "tooltip")
    .style("display", "none")
    .style("position", "absolute")
    .style("background", "rgba(255, 255, 255, 0.9)")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
    .style("pointer-events", "none")
    .style("font-size", "12px");

  // Create interaction rect
  svg
    .append("rect")
    .attr("width", plotWidth)
    .attr("height", plotHeight)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", () => {
      focus.style("display", null);
      tooltip.style("display", null);
    })
    .on("mouseout", () => {
      focus.style("display", "none");
      tooltip.style("display", "none");
    })
    .on("mousemove", (event) => {
      const [mouseX] = d3.pointer(event);
      const x0 = xScale.invert(mouseX);

      // Find nearest data point
      const bisect = d3.bisector((d: DataPoint) => d.x).left;
      const i = bisect(dataPoints, x0, 1);
      const d0 = dataPoints[i - 1];
      const d1 = dataPoints[i];

      if (!d0 || !d1) return;

      const d = x0 - d0.x > d1.x - x0 ? d1 : d0;

      focus.attr("transform", `translate(${xScale(d.x)},${yScale(d.y)})`);

      tooltip
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 30}px`)
        .html(
          `${getVariableLabel(xVar)}: ${formatVariableValue(Number(d.x), xVar)}<br>${getVariableLabel(yVar)}: ${formatVariableValue(Number(d.y), yVar)}`
        );
    })
    .on("click", (event) => {
      const [mouseX] = d3.pointer(event);
      const x0 = xScale.invert(mouseX);

      // Update the x-axis variable when user clicks
      try {
        runInAction(() => {
          computationStore.setValue(xVar, x0);
        });
      } catch (error) {
        console.error("Error updating variable:", error);
      }
    });
}

/**
 * Adds current point highlight to the plot
 */
export function addCurrentPointHighlight(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  currentPoint: DataPoint | null,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xRange: [number, number],
  yRange: [number, number],
  xVar?: string,
  yVar?: string
): void {
  if (
    !currentPoint ||
    !xVar ||
    !yVar ||
    currentPoint.x < xRange[0] ||
    currentPoint.x > xRange[1] ||
    currentPoint.y < yRange[0] ||
    currentPoint.y > yRange[1]
  ) {
    return;
  }

  // Add highlight circle
  svg
    .append("circle")
    .attr("class", "current-point")
    .attr("cx", xScale(currentPoint.x))
    .attr("cy", yScale(currentPoint.y))
    .attr("r", 6)
    .attr("fill", "#ef4444")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  // Add label
  svg
    .append("text")
    .attr("class", "current-point-label")
    .attr("x", xScale(currentPoint.x) + 10)
    .attr("y", yScale(currentPoint.y) - 10)
    .attr("fill", "#000")
    .attr("text-anchor", "start")
    .text(
      `${getVariableLabel(xVar)}: ${formatVariableValue(Number(currentPoint.x), xVar)}, ${getVariableLabel(yVar)}: ${formatVariableValue(Number(currentPoint.y), yVar)}`
    );
}