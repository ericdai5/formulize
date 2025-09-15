import { runInAction } from "mobx";
import * as d3 from "d3";

import { computationStore } from "../../store/computation";
import type { DataPoint } from "./Plot2D";
import { updateHoverPosition, setHoverVisibility } from "./hover";
import { updateTooltip, setTooltipVisibility } from "./tooltip";
import { updateCurrentPointLabel } from "./label";
import { scaleCurrentPoint } from "./current-point";

/**
 * Handles mouseover event for the interaction rectangle
 */
export function handleMouseOver(
  hover: d3.Selection<SVGGElement, unknown, null, undefined>,
  tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
  isDragging: boolean
): void {
  if (!isDragging) {
    setHoverVisibility(hover, true);
    setTooltipVisibility(tooltip, true);
  }
}

/**
 * Handles mouseout event for the interaction rectangle
 */
export function handleMouseOut(
  hover: d3.Selection<SVGGElement, unknown, null, undefined>,
  tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  isDragging: boolean
): void {
  if (!isDragging) {
    setHoverVisibility(hover, false);
    setTooltipVisibility(tooltip, false);
    // Reset current point scale when mouse leaves plot area
    scaleCurrentPoint(svg, false);
  }
}

/**
 * Handles mousemove event for the interaction rectangle
 */
export function handleMouseMove(
  event: MouseEvent,
  hover: d3.Selection<SVGGElement, unknown, null, undefined>,
  tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  dataPoints: DataPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  plotWidth: number,
  plotHeight: number,
  xAxisVar: string,
  yAxisVar: string,
  isDragging: boolean
): void {
  const [mouseX] = d3.pointer(event);
  const x0 = xScale.invert(mouseX);

  // Find nearest data point
  const bisect = d3.bisector((d: DataPoint) => d.x).left;
  const i = bisect(dataPoints, x0, 1);
  const d0 = dataPoints[i - 1];
  const d1 = dataPoints[i];

  if (!d0 || !d1) return;

  const d = x0 - d0.x > d1.x - x0 ? d1 : d0;

  // Check if hovering near the current point
  const currentX = computationStore.variables.get(xAxisVar)?.value ?? 0;
  const currentY = computationStore.variables.get(yAxisVar)?.value ?? 0;
  const isNearCurrentPoint =
    Math.abs(d.x - currentX) <
    (xScale.domain()[1] - xScale.domain()[0]) * 0.01; // Within 1% of x range

  // Update variable during drag
  if (isDragging) {
    // Hide the blue hover dot during dragging so red current point is visible
    setHoverVisibility(hover, false);
    try {
      runInAction(() => {
        computationStore.setValue(xAxisVar, d.x);
      });

      // Update current point highlight immediately during drag
      updateCurrentPointHighlight(svg, d, xScale, yScale, xAxisVar, yAxisVar);
    } catch (error) {
      console.error("Error updating variable during drag:", error);
    }
  } else if (isNearCurrentPoint) {
    // If hovering near current point, hide blue dot and scale up red dot
    setHoverVisibility(hover, false);
    scaleCurrentPoint(svg, true);

    updateTooltip(
      tooltip,
      currentX,
      currentY,
      event.pageX,
      event.pageY,
      xAxisVar,
      yAxisVar
    );
  } else {
    // Show hover dot during hover (not dragging, not near current point)
    setHoverVisibility(hover, true);
    
    // Update hover position with crosshairs
    updateHoverPosition(hover, d, xScale, yScale, plotWidth, plotHeight);
    
    scaleCurrentPoint(svg, false); // Reset current point scale

    updateTooltip(
      tooltip,
      d.x,
      d.y,
      event.pageX,
      event.pageY,
      xAxisVar,
      yAxisVar
    );
  }
}

/**
 * Handles mousedown event for the interaction rectangle
 */
export function handleMouseDown(
  event: MouseEvent,
  hover: d3.Selection<SVGGElement, unknown, null, undefined>,
  tooltip: d3.Selection<HTMLDivElement | null, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  xAxisVar: string
): void {
  runInAction(() => {
    computationStore.setDragging(true);
  });
  
  setHoverVisibility(hover, true);
  setTooltipVisibility(tooltip, false);

  // Change cursor to indicate dragging
  d3.select(event.currentTarget as Element).style("cursor", "grabbing");

  const [mouseX] = d3.pointer(event);
  const x0 = xScale.invert(mouseX);

  // Update the x-axis variable when user starts dragging
  try {
    runInAction(() => {
      computationStore.setValue(xAxisVar, x0);
    });
  } catch (error) {
    console.error("Error updating variable:", error);
  }
}

/**
 * Handles mouseup event for the interaction rectangle
 */
export function handleMouseUp(
  event: MouseEvent,
  hover: d3.Selection<SVGGElement, unknown, null, undefined>,
  plotWidth: number,
  plotHeight: number,
  onDragEnd?: () => void
): void {
  runInAction(() => {
    computationStore.setDragging(false);
  });
  
  d3.select(event.currentTarget as Element).style("cursor", "crosshair");

  // Trigger final re-render after dragging ends
  if (onDragEnd) {
    onDragEnd();
  }

  // Hide hover point when not dragging or hovering
  const [mouseX, mouseY] = d3.pointer(event);
  if (
    mouseX < 0 ||
    mouseX > plotWidth ||
    mouseY < 0 ||
    mouseY > plotHeight
  ) {
    setHoverVisibility(hover, false);
  }
}

/**
 * Handles click event for the interaction rectangle
 */
export function handleClick(
  event: MouseEvent,
  hover: d3.Selection<SVGGElement, unknown, null, undefined>,
  dataPoints: DataPoint[],
  xScale: d3.ScaleLinear<number, number>,
  xAxisVar: string,
  isDragging: boolean
): void {
  if (!isDragging) {
    const [mouseX] = d3.pointer(event);
    const x0 = xScale.invert(mouseX);

    // Find nearest data point for click position
    const bisect = d3.bisector((d: DataPoint) => d.x).left;
    const i = bisect(dataPoints, x0, 1);
    const d0 = dataPoints[i - 1];
    const d1 = dataPoints[i];

    if (d0 && d1) {
      const d = x0 - d0.x > d1.x - x0 ? d1 : d0;

      // Check if clicking near current point
      const currentX = computationStore.variables.get(xAxisVar)?.value ?? 0;
      const isNearCurrentPoint =
        Math.abs(d.x - currentX) <
        (xScale.domain()[1] - xScale.domain()[0]) * 0.01;

      // Update the x-axis variable when user clicks
      try {
        runInAction(() => {
          computationStore.setValue(xAxisVar, d.x);
        });

        // If clicking near current point, don't show blue hover dot
        if (isNearCurrentPoint) {
          setHoverVisibility(hover, false);
        }
      } catch (error) {
        console.error("Error updating variable:", error);
      }
    }
  }
}

/**
 * Updates the current point highlight during real-time interaction
 */
function updateCurrentPointHighlight(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  currentPoint: DataPoint,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xAxisVar?: string,
  yAxisVar?: string
): void {
  if (!xAxisVar || !yAxisVar) return;

  // Update existing current point circle
  svg
    .select("circle.current-point")
    .attr("cx", xScale(currentPoint.x))
    .attr("cy", yScale(currentPoint.y));

  // Update existing current point label
  updateCurrentPointLabel(svg, currentPoint, xScale, yScale, xAxisVar, yAxisVar);
}

