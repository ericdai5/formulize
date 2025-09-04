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
  xVar?: string;
  yVar?: string;
  xVarHovered?: boolean;
  yVarHovered?: boolean;
  tickFontSize?: number;
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
    xVar,
    yVar,
    xVarHovered = false,
    yVarHovered = false,
    tickFontSize = 12,
  } = config;

  // Add X axis
  const xAxis = svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(xScale).tickSize(0));

  // Style X axis line to match grid opacity
  xAxis.selectAll("path").attr("opacity", 0.1);

  // Style X axis text to be black
  xAxis
    .selectAll("text")
    .attr("fill", "#000")
    .attr("opacity", 1)
    .attr("font-size", `${tickFontSize}px`);

  if (xLabel) {
    // Create a group for the X label with background
    const xLabelGroup = xAxis
      .append("g")
      .attr("class", "axis-label-group")
      .attr("transform", `translate(${plotWidth / 2}, 40)`)
      .style("cursor", "pointer");

    // Add background rectangle (show if variable is hovered)
    const xLabelBg = xLabelGroup
      .append("rect")
      .attr("class", "axis-label-bg")
      .attr("fill", "#f3f4f6")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("opacity", xVarHovered ? 1 : 0);

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

    // Add hover functionality if xVar is provided
    if (xVar) {
      xLabelGroup
        .on("mouseenter", () => {
          xLabelBg.attr("opacity", 1);
          computationStore.setVariableHover(xVar, true);
        })
        .on("mouseleave", () => {
          xLabelBg.attr("opacity", 0);
          computationStore.setVariableHover(xVar, false);
        });
    }
  }

  // Add Y axis
  const yAxis = svg
    .append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).tickSize(0));

  // Style Y axis line to match grid opacity
  yAxis.selectAll("path").attr("opacity", 0.1);

  // Style Y axis text to be black
  yAxis
    .selectAll("text")
    .attr("fill", "#000")
    .attr("opacity", 1)
    .attr("font-size", `${tickFontSize}px`);

  if (yLabel) {
    // Create a group for the Y label with background
    const yLabelGroup = yAxis
      .append("g")
      .attr("class", "axis-label-group")
      .attr("transform", `translate(${-margin.left + 20}, ${plotHeight / 2})`)
      .style("cursor", "pointer");

    // Add background rectangle (show if variable is hovered)
    const yLabelBg = yLabelGroup
      .append("rect")
      .attr("class", "axis-label-bg")
      .attr("fill", "#f3f4f6")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("opacity", yVarHovered ? 1 : 0);

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
      .attr("transform", "rotate(-90)")
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

    // Add hover functionality if yVar is provided
    if (yVar) {
      yLabelGroup
        .on("mouseenter", () => {
          yLabelBg.attr("opacity", 1);
          computationStore.setVariableHover(yVar, true);
        })
        .on("mouseleave", () => {
          yLabelBg.attr("opacity", 0);
          computationStore.setVariableHover(yVar, false);
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
