import * as d3 from "d3";

export interface AxisConfig {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  plotWidth: number;
  plotHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
  xLabel?: string;
  yLabel?: string;
}

/**
 * Adds X and Y axes to the SVG with optional labels
 */
export function addAxes(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  config: AxisConfig
): void {
  const { xScale, yScale, plotWidth, plotHeight, margin, xLabel, yLabel } = config;

  // Add X axis
  const xAxis = svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(xScale));

  if (xLabel) {
    xAxis
      .append("text")
      .attr("class", "axis-label")
      .attr("x", plotWidth / 2)
      .attr("y", 40)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text(xLabel);
  }

  // Add Y axis
  const yAxis = svg
    .append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));

  if (yLabel) {
    yAxis
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -plotHeight / 2)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text(yLabel);
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