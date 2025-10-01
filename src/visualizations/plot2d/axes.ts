import * as d3 from "d3";

import { computationStore } from "../../store/computation";

export interface AxisConfig {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  plotWidth: number;
  plotHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
  xLabel?: string;
  yLabel?: string;
  xAxisVar?: string;
  yAxisVar?: string;
  xAxisVarHovered?: boolean;
  yAxisVarHovered?: boolean;
  tickFontSize?: number;
  xAxisInterval?: number;
  yAxisInterval?: number;
  xAxisPos?: "center" | "edge";
  yAxisPos?: "center" | "edge";
  xLabelPos?: "center" | "right";
  yLabelPos?: "center" | "top";
  // Vector variables for enhanced axis hovering
  allXVariables?: string[];
  allYVariables?: string[];
}

/**
 * Adds X and Y axes to the SVG with optional labels
 */
export function addAxes(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  config: AxisConfig
): void {
  const {
    xScale,
    yScale,
    plotWidth,
    plotHeight,
    margin,
    xLabel,
    yLabel,
    xAxisVar,
    yAxisVar,
    xAxisVarHovered = false,
    yAxisVarHovered = false,
    tickFontSize = 12,
    xAxisInterval,
    yAxisInterval,
    xAxisPos = "edge",
    yAxisPos = "edge",
    xLabelPos = xAxisPos === "center" ? "right" : "center",
    yLabelPos = "center",
    allXVariables = [],
    allYVariables = [],
  } = config;

  // Calculate axis positions
  const [yMin, yMax] = yScale.domain();
  const [xMin, xMax] = xScale.domain();

  // X-axis position: at bottom edge or at y=0
  const xAxisY =
    xAxisPos === "center"
      ? Math.max(0, Math.min(yScale(0), plotHeight)) // Clamp to plot bounds
      : plotHeight;

  // Y-axis position: at left edge or at x=0
  const yAxisX =
    yAxisPos === "center"
      ? Math.max(0, Math.min(xScale(0), plotWidth)) // Clamp to plot bounds
      : 0;

  // Create X axis with interval-based ticks if specified
  const xAxisGenerator = d3.axisBottom(xScale).tickSize(0);
  if (xAxisInterval !== undefined) {
    const tickValues = d3.range(xMin, xMax + xAxisInterval / 2, xAxisInterval);
    xAxisGenerator.tickValues(tickValues);
  }

  // Add X axis
  const xAxis = svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${xAxisY})`)
    .call(xAxisGenerator);

  // Style X axis line to match grid opacity
  xAxis.selectAll("path").attr("opacity", 0.1);

  // Style X axis text to be black
  xAxis
    .selectAll("text")
    .attr("fill", "#000")
    .attr("opacity", 1)
    .attr("font-size", `${tickFontSize}px`);

  if (xLabel) {
    // Calculate X label position and offset
    const xLabelX = xLabelPos === "right" ? plotWidth + 30 : plotWidth / 2;
    const xLabelY = xLabelPos === "right" ? 0 : 40;

    // Create a group for the X label with background
    const xLabelGroup = xAxis
      .append("g")
      .attr("class", "axis-label-group")
      .attr("transform", `translate(${xLabelX}, ${xLabelY})`)
      .style("cursor", "pointer");

    // Add background rectangle (show if variable is hovered)
    const xLabelBg = xLabelGroup
      .append("rect")
      .attr("class", "axis-label-bg")
      .attr("fill", "#f3f4f6")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("opacity", xAxisVarHovered ? 1 : 0);

    // Add the text element
    const xLabelElement = xLabelGroup
      .append("text")
      .attr("class", "axis-label")
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "#000")
      .attr("opacity", 1)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "14px")
      .text(xLabel);

    // Calculate and set background dimensions
    const xLabelBBox = (xLabelElement.node() as SVGTextElement)?.getBBox();
    if (xLabelBBox) {
      const padding = 8;
      xLabelBg
        .attr("x", xLabelBBox.x - padding)
        .attr("y", xLabelBBox.y - padding)
        .attr("width", xLabelBBox.width + 2 * padding)
        .attr("height", xLabelBBox.height + 2 * padding);
    }

    // Add hover functionality for X axis (always register handlers when xAxisVar exists)
    if (xAxisVar || allXVariables.length > 0) {
      xLabelGroup
        .on("mouseenter", () => {
          xLabelBg.attr("opacity", 1);
          // Highlight the axis variable if it exists
          if (xAxisVar) {
            computationStore.setVariableHover(xAxisVar, true);
          }
          // Highlight all X components of vectors
          allXVariables.forEach((varId) => {
            computationStore.setVariableHover(varId, true);
          });
        })
        .on("mouseleave", () => {
          xLabelBg.attr("opacity", 0);
          // Clear axis variable hover if it exists
          if (xAxisVar) {
            computationStore.setVariableHover(xAxisVar, false);
          }
          // Clear all X components of vectors
          allXVariables.forEach((varId) => {
            computationStore.setVariableHover(varId, false);
          });
        });
    }
  }

  // Create Y axis with interval-based ticks if specified
  const yAxisGenerator = d3.axisLeft(yScale).tickSize(0);
  if (yAxisInterval !== undefined) {
    const tickValues = d3.range(yMin, yMax + yAxisInterval / 2, yAxisInterval);
    yAxisGenerator.tickValues(tickValues);
  }

  // Add Y axis
  const yAxis = svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${yAxisX},0)`)
    .call(yAxisGenerator);

  // Style Y axis line to match grid opacity
  yAxis.selectAll("path").attr("opacity", 0.1);

  // Style Y axis text to be black
  yAxis
    .selectAll("text")
    .attr("fill", "#000")
    .attr("opacity", 1)
    .attr("font-size", `${tickFontSize}px`);

  if (yLabel) {
    // Calculate Y label position and rotation
    const yLabelY = yLabelPos === "top" ? -20 : plotHeight / 2;
    const yLabelX = yLabelPos === "top" ? 0 : -margin.left + 20;
    const yLabelRotation = yLabelPos === "top" ? 0 : -90;

    // Create a group for the Y label with background
    const yLabelGroup = yAxis
      .append("g")
      .attr("class", "axis-label-group")
      .attr("transform", `translate(${yLabelX}, ${yLabelY})`)
      .style("cursor", "pointer");

    // Add background rectangle (show if variable is hovered)
    const yLabelBg = yLabelGroup
      .append("rect")
      .attr("class", "axis-label-bg")
      .attr("fill", "#f3f4f6")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("opacity", yAxisVarHovered ? 1 : 0);

    // Add the text element
    const yLabelElement = yLabelGroup
      .append("text")
      .attr("class", "axis-label")
      .attr("x", 0)
      .attr("y", 0)
      .attr("fill", "#000")
      .attr("opacity", 1)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "14px")
      .attr("transform", `rotate(${yLabelRotation})`)
      .text(yLabel);

    // Calculate and set background dimensions (swap width/height for vertical orientation)
    const yLabelBBox = (yLabelElement.node() as SVGTextElement)?.getBBox();
    if (yLabelBBox) {
      const padding = 8;
      yLabelBg
        .attr("x", -yLabelBBox.height / 2 - padding)
        .attr("y", -yLabelBBox.width / 2 - padding)
        .attr("width", yLabelBBox.height + 2 * padding)
        .attr("height", yLabelBBox.width + 2 * padding);
    }

    // Add hover functionality for Y axis (always register handlers when yAxisVar exists)
    if (yAxisVar || allYVariables.length > 0) {
      yLabelGroup
        .on("mouseenter", () => {
          yLabelBg.attr("opacity", 1);
          // Highlight the axis variable if it exists
          if (yAxisVar) {
            computationStore.setVariableHover(yAxisVar, true);
          }
          // Highlight all Y components of vectors
          allYVariables.forEach((varId) => {
            computationStore.setVariableHover(varId, true);
          });
        })
        .on("mouseleave", () => {
          yLabelBg.attr("opacity", 0);
          // Clear axis variable hover if it exists
          if (yAxisVar) {
            computationStore.setVariableHover(yAxisVar, false);
          }
          // Clear all Y components of vectors
          allYVariables.forEach((varId) => {
            computationStore.setVariableHover(varId, false);
          });
        });
    }
  }
}

/**
 * Adds grid lines to the plot
 */
export function addGrid(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  config: AxisConfig
): void {
  const { xScale, yScale, plotWidth, plotHeight } = config;

  // Add Y grid lines
  svg
    .append("g")
    .attr("class", "grid")
    .attr("opacity", 0.1)
    .call(
      d3
        .axisLeft(yScale)
        .tickSize(-plotWidth)
        .tickFormat(() => "")
    );

  // Add X grid lines
  svg
    .append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${plotHeight})`)
    .attr("opacity", 0.1)
    .call(
      d3
        .axisBottom(xScale)
        .tickSize(-plotHeight)
        .tickFormat(() => "")
    );
}
