import * as d3 from "d3";

import { ComputationStore } from "../../store/computation";
import { ExecutionStore } from "../../store/execution";
import type { IStepPoint } from "../../types/plot2d";

interface StoredPoint {
  viewId: string;
  x: number;
  y: number;
  timestamp: number;
  config: IStepPoint;
}

/**
 * Tracks and renders step points based on view changes
 */
export class StepPointsManager {
  // Store all points that should be rendered (persistent and non-persistent)
  private storedPoints: StoredPoint[] = [];
  // Track last values to avoid duplicate points at same position
  private lastValues: Map<string, { x: number; y: number }> = new Map();

  /**
   * Update and render step points based on current view
   */
  public updateStepPoints(
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    stepPoints: Record<string, IStepPoint | IStepPoint[]> | undefined,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    xRange: [number, number],
    yRange: [number, number],
    computationStore: ComputationStore,
    executionStore: ExecutionStore
  ): void {
    if (!stepPoints) return;

    // Get current view ID from the current step
    const currentStep = executionStore.history[executionStore.historyIndex];
    const currentViewId = currentStep?.view?.id;

    if (!currentViewId) {
      // No current view ID, just render existing points
      this.renderAllPoints(svg, xScale, yScale);
      return;
    }

    // Check if this view has step points defined
    const viewPoints = stepPoints[currentViewId];
    if (!viewPoints) {
      // No points for this view, just render existing points
      this.renderAllPoints(svg, xScale, yScale);
      return;
    }

    // Process the points for this view
    const pointsArray = Array.isArray(viewPoints) ? viewPoints : [viewPoints];

    pointsArray.forEach((config, index) => {
      // Get the x and y values
      const xValue = this.evaluateExpression(config.xValue, computationStore);
      const yValue = this.evaluateExpression(config.yValue, computationStore);

      if (xValue !== null && yValue !== null) {
        // Check if point is within bounds
        if (
          xValue >= xRange[0] &&
          xValue <= xRange[1] &&
          yValue >= yRange[0] &&
          yValue <= yRange[1]
        ) {
          // Create a unique key for this point
          const pointKey = `${currentViewId}_${index}_${config.xValue}_${config.yValue}`;

          // Check if the value has changed (to avoid duplicate points at same position)
          const lastValue = this.lastValues.get(pointKey);
          if (!lastValue || lastValue.x !== xValue || lastValue.y !== yValue) {
            // Add to stored points
            this.storedPoints.push({
              viewId: currentViewId,
              x: xValue,
              y: yValue,
              timestamp: Date.now(),
              config,
            });

            // If not persistent, remove old points for this view
            if (!config.persistence) {
              // Keep only the most recent non-persistent point for this view
              this.storedPoints = this.storedPoints.filter(
                (p) =>
                  p.viewId !== currentViewId ||
                  p.config.persistence ||
                  p.timestamp === this.storedPoints[this.storedPoints.length - 1].timestamp
              );
            }

            // Update last value
            this.lastValues.set(pointKey, { x: xValue, y: yValue });
          }
        }
      }
    });

    // Render all points (this happens after SVG clear in Plot2D)
    this.renderAllPoints(svg, xScale, yScale);
  }

  /**
   * Evaluate an expression to get a numeric value
   */
  private evaluateExpression(
    expression: string,
    computationStore: ComputationStore
  ): number | null {
    // Simple case: direct variable reference
    const variable = computationStore.variables.get(expression);
    if (variable && typeof variable.value === "number") {
      return variable.value;
    }

    // Try to evaluate as a simple expression (for future enhancement)
    // For now, just return null for complex expressions
    return null;
  }

  /**
   * Render all stored points on the plot
   */
  private renderAllPoints(
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>
  ): void {
    // Remove existing step points (they were cleared with the SVG)
    svg.selectAll(".step-point").remove();
    svg.selectAll(".step-point-label").remove();

    // Render each stored point
    this.storedPoints.forEach((point) => {
      const pointId = `step-point-${point.viewId}-${point.timestamp}`;
      const color = point.config.color || "#3b82f6"; // Default blue
      const size = point.config.size || 6;

      // Add the point
      svg
        .append("circle")
        .attr("class", `step-point step-point-${point.viewId}`)
        .attr("id", pointId)
        .attr("cx", xScale(point.x))
        .attr("cy", yScale(point.y))
        .attr("r", size)
        .attr("fill", color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("opacity", 0.9);

      // Add label if specified
      if (point.config.label) {
        const labelGroup = svg
          .append("g")
          .attr("class", `step-point-label step-point-label-${point.viewId}`)
          .attr("id", `${pointId}-label`);

        labelGroup
          .append("text")
          .attr("x", xScale(point.x))
          .attr("y", yScale(point.y) - size - 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "12px")
          .attr("fill", color)
          .text(point.config.label);
      }
    });
  }

  /**
   * Clear all stored points
   */
  public clearAllPoints(
    svg: d3.Selection<SVGGElement, unknown, null, undefined>
  ): void {
    svg.selectAll(".step-point").remove();
    svg.selectAll(".step-point-label").remove();
    this.storedPoints = [];
    this.lastValues.clear();
  }
}