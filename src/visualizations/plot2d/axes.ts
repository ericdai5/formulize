import * as d3 from "d3";

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

export interface AxisLabelInfo {
  xLabel?: {
    text: string;
    x: number;
    y: number;
    xAxisVar?: string;
    allXVariables: string[];
  };
  yLabel?: {
    text: string;
    x: number;
    y: number;
    rotation: number;
    yAxisVar?: string;
    allYVariables: string[];
  };
}

/**
 * Adds X and Y axes to the SVG and returns label information for React rendering
 */
export function addAxes(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  config: AxisConfig
): AxisLabelInfo {
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

  // Calculate X label position (to be returned for React rendering)
  let xLabelInfo: AxisLabelInfo["xLabel"] | undefined;
  if (xLabel) {
    const xLabelX = xLabelPos === "right" ? plotWidth + 30 : plotWidth / 2;
    const xLabelY = xLabelPos === "right" ? 0 : 40;

    xLabelInfo = {
      text: xLabel,
      x: margin.left + xLabelX,
      y: margin.top + xAxisY + xLabelY,
      xAxisVar,
      allXVariables,
    };
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

  // Calculate Y label position (to be returned for React rendering)
  let yLabelInfo: AxisLabelInfo["yLabel"] | undefined;
  if (yLabel) {
    const yLabelY = yLabelPos === "top" ? -30 : plotHeight / 2;
    const yLabelX = yLabelPos === "top" ? 0 : -margin.left + 20;
    const yLabelRotation = yLabelPos === "top" ? 0 : -90;

    yLabelInfo = {
      text: yLabel,
      x: margin.left + yAxisX + yLabelX,
      y: margin.top + yLabelY,
      rotation: yLabelRotation,
      yAxisVar,
      allYVariables,
    };
  }

  return {
    xLabel: xLabelInfo,
    yLabel: yLabelInfo,
  };
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
