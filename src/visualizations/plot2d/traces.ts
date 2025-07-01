import * as d3 from "d3";
import { getVariableValue } from "../../util/computation-helpers";
import { createArrowMarker, getMarkerUrl } from "./markers";

export interface TraceData {
  x: number;
  y: number;
}

export interface TraceConfig {
  x: (string | number)[];
  y: (string | number)[];
  shape?: "arrow" | "dash";
  line?: {
    color?: string;
    width?: number;
  };
  marker?: {
    size?: number;
    color?: string;
  };
}

/**
 * Processes trace data by resolving variable references
 */
export function processTraceData(trace: TraceConfig): TraceData[] {
  const xData = trace.x.map((val) =>
    typeof val === "string"
      ? getVariableValue(val.replace(/[{}]/g, ""))
      : val
  );
  const yData = trace.y.map((val) =>
    typeof val === "string"
      ? getVariableValue(val.replace(/[{}]/g, ""))
      : val
  );

  return xData.map((x, i) => ({
    x: Number(x),
    y: Number(yData[i]),
  }));
}

/**
 * Renders a single trace on the SVG
 */
export function renderTrace(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  trace: TraceConfig,
  traceIndex: number,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
): void {
  const traceData = processTraceData(trace);
  const shape = trace.shape || "arrow";
  const color = trace.line?.color || "#3b82f6";

  // Create arrow marker if needed
  if (shape === "arrow") {
    createArrowMarker(defs, {
      id: `arrowhead-${traceIndex}`,
      color,
      size: trace.marker?.size || 6,
    });
  }

  // Create line generator
  const line = d3
    .line<TraceData>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  // Add the path
  svg
    .append("path")
    .datum(traceData)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", trace.line?.width || 2)
    .attr("stroke-dasharray", shape === "dash" ? "5,5" : "none")
    .attr(
      "marker-end",
      shape === "arrow" ? getMarkerUrl(`arrowhead-${traceIndex}`) : "none"
    )
    .attr("d", line);
}

/**
 * Renders all traces on the SVG
 */
export function renderTraces(
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  traces: TraceConfig[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
): void {
  traces.forEach((trace, index) => {
    renderTrace(svg, defs, trace, index, xScale, yScale);
  });
}