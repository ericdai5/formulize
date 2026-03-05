export interface IGraph3D {
  id: string;
  xAxis?: string;
  xRange?: [number, number];
  yAxis?: string;
  yRange?: [number, number];
  zVar?: string;
  zRange?: [number, number];
  width?: number | string;
  height?: number | string;
  plotType?: "scatter" | "surface" | "line" | "mesh";
  showCurrentPointInLegend?: boolean;
  /**
   * Graph-based visualizations using data collected by sample() calls in manual functions.
   */
  lines?: I3DLine[];
  points?: I3DPoint[];
  surfaces?: I3DSurface[];
}

/**
 * Base configuration for graph-based visualizations.
 * All graphs read x, y, z values from explicit sample() calls: sample("sampleId", {x, y, z})
 * @property: sampleId - Graph sample ID to match sample() calls in manual function.
 * @property: name - Display name for the legend
 * @property: showInLegend - Whether to show in legend
 */
interface IGraphBase {
  sampleId: string;
  name?: string;
  showInLegend?: boolean;
}

/**
 * Line graph: samples over 1 parameter to create a 3D line
 * @property: parameter - The variable to vary during sampling (1 parameter for lines)
 * @property: range - Optional range to sample over the parameter (defaults to the variable's range)
 * @property: samples - Number of samples (default 100)
 * @property: color - Line color
 * @property: width - Line width
 */
export interface I3DLine extends IGraphBase {
  parameter: string;
  range?: [number, number];
  samples?: number;
  color?: string;
  width?: number;
}

/**
 * Surface graph: samples over 2 parameters to create a 3D surface
 * @property: parameters - The variables to vary during sampling (2 parameters for surfaces)
 * @property: ranges - Optional ranges to sample over the parameters (defaults to the variables' ranges)
 * @property: samples - Number of samples for each parameter (default 50)
 * @property: color - Surface color or colorscale
 * @property: opacity - Surface opacity (0-1)
 * @property: showColorbar - Whether to show colorbar
 */
export interface I3DSurface extends IGraphBase {
  parameters: [string, string];
  ranges?: [[number, number], [number, number]];
  samples?: number;
  color?: string | string[];
  opacity?: number;
  showColorbar?: boolean;
}

/**
 * Point graph: shows the current point without sampling
 * @property: color - Marker color
 * @property: size - Marker size
 */
export interface I3DPoint extends IGraphBase {
  color?: string;
  size?: number;
}

export type IGraph = I3DLine | I3DSurface | I3DPoint;

export interface IPoint3D {
  x: number;
  y: number;
  z: number | null;
}
