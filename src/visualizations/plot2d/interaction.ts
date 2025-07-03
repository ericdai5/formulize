import { runInAction } from "mobx";

import * as d3 from "d3";

import { computationStore } from "../../api/computation";
import type { DataPoint } from "./Plot2D";
import { formatVariableValue, getVariableLabel } from "./utils";

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
  yVar?: string,
  onDragEnd?: () => void
): void {
  if (!xVar || !yVar || dataPoints.length === 0) return;

  // Add invisible overlay for hover interaction
  const focus = svg.append("g").attr("class", "focus").style("display", "none");

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
  let isDragging = false;
  
  svg
    .append("rect")
    .attr("width", plotWidth)
    .attr("height", plotHeight)
    .style("fill", "none")
    .style("pointer-events", "all")
    .style("cursor", "crosshair")
    .on("mouseover", () => {
      if (!isDragging) {
        focus.style("display", null);
        tooltip.style("display", null);
      }
    })
    .on("mouseout", () => {
      if (!isDragging) {
        focus.style("display", "none");
        tooltip.style("display", "none");
        // Reset current point scale when mouse leaves plot area
        scaleCurrentPoint(svg, false);
      }
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

      // Check if hovering near the current point
      const currentX = computationStore.variables.get(xVar)?.value ?? 0;
      const currentY = computationStore.variables.get(yVar)?.value ?? 0;
      const isNearCurrentPoint = Math.abs(d.x - currentX) < (xScale.domain()[1] - xScale.domain()[0]) * 0.01; // Within 1% of x range

      // Update variable during drag
      if (isDragging) {
        // Hide the blue focus dot during dragging so red current point is visible
        focus.style("display", "none");
        
        try {
          runInAction(() => {
            computationStore.setValue(xVar, d.x);
          });
          
          // Update current point highlight immediately during drag
          updateCurrentPointHighlight(svg, d, xScale, yScale, xVar, yVar);
        } catch (error) {
          console.error("Error updating variable during drag:", error);
        }
      } else if (isNearCurrentPoint) {
        // If hovering near current point, hide blue dot and scale up red dot
        focus.style("display", "none");
        scaleCurrentPoint(svg, true);
        
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 30}px`)
          .html(
            `${getVariableLabel(xVar)}: ${formatVariableValue(Number(currentX), xVar)}<br>${getVariableLabel(yVar)}: ${formatVariableValue(Number(currentY), yVar)}`
          );
      } else {
        // Show focus dot during hover (not dragging, not near current point)
        focus.attr("transform", `translate(${xScale(d.x)},${yScale(d.y)})`);
        scaleCurrentPoint(svg, false); // Reset current point scale
        
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 30}px`)
          .html(
            `${getVariableLabel(xVar)}: ${formatVariableValue(Number(d.x), xVar)}<br>${getVariableLabel(yVar)}: ${formatVariableValue(Number(d.y), yVar)}`
          );
      }
    })
    .on("mousedown", (event) => {
      runInAction(() => {
        computationStore.setDragging(true);
      });
      isDragging = true;
      focus.style("display", null);
      tooltip.style("display", "none");
      
      // Change cursor to indicate dragging
      d3.select(event.currentTarget).style("cursor", "grabbing");
      
      const [mouseX] = d3.pointer(event);
      const x0 = xScale.invert(mouseX);

      // Update the x-axis variable when user starts dragging
      try {
        runInAction(() => {
          computationStore.setValue(xVar, x0);
        });
      } catch (error) {
        console.error("Error updating variable:", error);
      }
    })
    .on("mouseup", (event) => {
      runInAction(() => {
        computationStore.setDragging(false);
      });
      isDragging = false;
      d3.select(event.currentTarget).style("cursor", "crosshair");
      
      // Trigger final re-render after dragging ends
      if (onDragEnd) {
        onDragEnd();
      }
      
      // Hide focus point when not dragging or hovering
      const [mouseX, mouseY] = d3.pointer(event);
      if (mouseX < 0 || mouseX > plotWidth || mouseY < 0 || mouseY > plotHeight) {
        focus.style("display", "none");
      }
    })
    .on("click", (event) => {
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
          const currentX = computationStore.variables.get(xVar)?.value ?? 0;
          const isNearCurrentPoint = Math.abs(d.x - currentX) < (xScale.domain()[1] - xScale.domain()[0]) * 0.01;
          
          // Update the x-axis variable when user clicks
          try {
            runInAction(() => {
              computationStore.setValue(xVar, d.x);
            });
            
            // If clicking near current point, don't show blue focus dot
            if (isNearCurrentPoint) {
              focus.style("display", "none");
            }
          } catch (error) {
            console.error("Error updating variable:", error);
          }
        }
      }
    });
}

/**
 * Updates the current point highlight during real-time interaction
 */
function updateCurrentPointHighlight(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  currentPoint: DataPoint,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  xVar?: string,
  yVar?: string
): void {
  if (!xVar || !yVar) return;

  // Update existing current point circle
  svg.select("circle.current-point")
    .attr("cx", xScale(currentPoint.x))
    .attr("cy", yScale(currentPoint.y));

  // Update existing current point label
  const labelText = `${getVariableLabel(xVar)}: ${formatVariableValue(Number(currentPoint.x), xVar)}, ${getVariableLabel(yVar)}: ${formatVariableValue(Number(currentPoint.y), yVar)}`;
  const labelX = xScale(currentPoint.x) + 10;
  const labelY = yScale(currentPoint.y) - 10;
  
  const labelElement = svg.select("text.current-point-label");
  labelElement
    .attr("x", labelX)
    .attr("font-size", "14px")
    .attr("font-family", "Arial, sans-serif")
    .attr("font-weight", "500")
    .text(labelText);
  
  // Update background rectangle position and size with centered positioning
  const labelNode = labelElement.node() as SVGTextElement;
  if (labelNode) {
    const bbox = labelNode.getBBox();
    const rectHeight = bbox.height + 8;
    const rectY = labelY - bbox.height - 4;
    const centeredTextY = rectY + rectHeight / 2 + bbox.height / 3; // Adjust for text baseline
    
    // Update text y position to be centered
    labelElement.attr("y", centeredTextY);
    
    // Update background rectangle
    svg.select("rect.current-point-label-bg")
      .attr("x", labelX - 8)
      .attr("y", rectY)
      .attr("width", bbox.width + 16)
      .attr("height", rectHeight);
  }
}

/**
 * Scales the current point up or down for hover effect
 */
function scaleCurrentPoint(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  scaleUp: boolean
): void {
  const currentPointCircle = svg.select("circle.current-point");
  if (!currentPointCircle.empty()) {
    currentPointCircle
      .transition()
      .duration(150)
      .attr("r", scaleUp ? 9 : 6); // Scale from 6 to 9 on hover
  }
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

  // Add background rectangle for label
  const labelText = `${getVariableLabel(xVar)}: ${formatVariableValue(Number(currentPoint.x), xVar)}, ${getVariableLabel(yVar)}: ${formatVariableValue(Number(currentPoint.y), yVar)}`;
  const labelX = xScale(currentPoint.x) + 10;
  const labelY = yScale(currentPoint.y) - 10;
  
  // Create temporary text element to measure dimensions
  const tempText = svg
    .append("text")
    .attr("font-size", "14px")
    .attr("font-family", "Arial, sans-serif")
    .attr("font-weight", "500")
    .text(labelText)
    .style("visibility", "hidden");
  
  const tempTextNode = tempText.node() as SVGTextElement;
  const bbox = tempTextNode?.getBBox();
  tempText.remove();
  
  if (bbox) {
    // Calculate centered positioning
    const rectHeight = bbox.height + 8;
    const rectY = labelY - bbox.height - 4;
    const centeredTextY = rectY + rectHeight / 2 + bbox.height / 3; // Adjust for text baseline
    
    // Add background rectangle with more padding and rounded corners
    svg
      .append("rect")
      .attr("class", "current-point-label-bg")
      .attr("x", labelX - 8)
      .attr("y", rectY)
      .attr("width", bbox.width + 16)
      .attr("height", rectHeight)
      .attr("fill", "white")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1)
      .attr("rx", 6);

    // Add label with larger text, centered vertically
    svg
      .append("text")
      .attr("class", "current-point-label")
      .attr("x", labelX)
      .attr("y", centeredTextY)
      .attr("fill", "#000")
      .attr("text-anchor", "start")
      .attr("font-size", "14px")
      .attr("font-family", "Arial, sans-serif")
      .attr("font-weight", "500")
      .text(labelText);
  }
}
