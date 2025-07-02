import * as d3 from "d3";

export interface MarkerConfig {
  id: string;
  color: string;
  size?: number;
}

/**
 * Creates an arrow marker definition for SVG
 */
export function createArrowMarker(
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  config: MarkerConfig
): void {
  defs
    .append("marker")
    .attr("id", config.id)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 8)
    .attr("refY", 0)
    .attr("markerWidth", config.size || 6)
    .attr("markerHeight", config.size || 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", config.color);
}

/**
 * Gets the marker-end URL for a given marker ID
 */
export function getMarkerUrl(markerId: string): string {
  return `url(#${markerId})`;
}

/**
 * Renders point markers (circles) at specified data points
 */
export function renderPointMarkers(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  vectorData: Array<{ x: number; y: number }>,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  color: string,
  markerSize: number = 4
): void {
  vectorData.forEach((point) => {
    svg
      .append("circle")
      .attr("cx", xScale(point.x))
      .attr("cy", yScale(point.y))
      .attr("r", markerSize)
      .attr("fill", color)
      .attr("stroke", color)
      .attr("stroke-width", 1);
  });
}