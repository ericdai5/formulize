export interface IVector {
  x: (string | number)[];
  y: (string | number)[];
  shape?: "arrow" | "dash" | "point";
  color?: string;
  lineWidth?: number;
  markerSize?: number;
  name?: string;
  draggable?: boolean;
  showlegend?: boolean;
  // Optional on-canvas label configuration
  label?: string;
  labelPosition?: "start" | "mid" | "end";
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelColor?: string;
  labelFontSize?: number;
}

/**
 * Base configuration for graph-based 2D visualizations.
 * Uses explicit data2d() calls in manual functions to collect coordinates.
 * @property: id - Graph ID to match data2d() calls in manual function (required)
 * @property: name - Display name for the legend
 * @property: showInLegend - Whether to show in legend
 */
interface I2DConfigBase {
  id: string;
  name?: string;
  showInLegend?: boolean;
}

/**
 * Line graph: samples over a parameter variable to create a 2D line/curve.
 * The manual function must call data2d(id, {x, y}) to provide coordinates.
 * @property: type - The type of object to graph
 * @property: parameter - The variable to vary during sampling (1 parameter for lines)
 * @property: range - Optional range to sample over the parameter (defaults to the variable's range)
 * @property: samples - Number of samples (default 100)
 * @property: color - Line color
 * @property: lineWidth - Line width
 * @property: interaction - Drag interaction: ["horizontal-drag" | "vertical-drag", variableName]
 */
export interface I2DLine extends I2DConfigBase {
  type: "line";
  parameter: string;
  range?: [number, number];
  samples?: number;
  color?: string;
  lineWidth?: number;
  interaction?: ["horizontal-drag" | "vertical-drag", string];
}

/**
 * Point graph: shows the current point without sampling (0 parameters).
 * The manual function must call data2d(id, {x, y}) to provide coordinates.
 * @property type - The type of object to graph
 * @property color - Marker color
 * @property size - Marker size
 * @property showLabel - Whether to show label
 * @property interaction - Drag interaction: ["horizontal-drag" | "vertical-drag", variableName]
 * @property stepId - Optional step ID that controls when this point appears during stepping.
 *                    When set, the point only appears after the step() call with matching id has been reached.
 * @property persistence - Controls point visibility during stepping:
 *                         'accumulate' (default) = point stays visible after its step
 *                         'once' = point only visible at that exact step
 */
export interface I2DPoint extends I2DConfigBase {
  type: "point";
  color?: string;
  size?: number;
  showLabel?: boolean;
  interaction?: ["horizontal-drag" | "vertical-drag", string];
  stepId?: string;
  persistence?: "accumulate" | "once";
}

export type I2DConfig = I2DLine | I2DPoint;

/**
 * Plot2D visualization configuration.
 * @property type - The type of the plot.
 * @property id - The id of the plot.
 * @property title - The title of the plot.
 * @property xAxisLabel - The label for the x-axis (cosmetic only, does not affect graphing).
 * @property xAxisVar - The variable to bind to x-axis for hover highlighting (optional)
 * @property xRange - The range of the x-axis.
 * @property xAxisInterval - The interval of the x-axis.
 * @property xAxisPos - The position of the x-axis. "center" = x-axis at y=0, "edge" = x-axis at bottom
 * @property xGrid - The grid visibility for the x-axis.
 * @property yAxisLabel - The label for the y-axis (cosmetic only, does not affect graphing).
 * @property yAxisVar - The variable to bind to y-axis for hover highlighting (optional)
 * @property yRange - The range of the y-axis.
 * @property yAxisInterval - The interval of the y-axis.
 * @property yAxisPos - The position of the y-axis.
 * @property yGrid - The grid visibility for the y-axis.
 * @property vectors - The vectors for the plot.
 * @property graphs - Graph-based visualizations using data collected by data2d() calls.
 *                    Points with stepId will only appear during stepping when that step is reached.
 * @property width - The width of the plot.
 * @property height - The height of the plot.
 * @property tickFontSize - The font size of the ticks.
 * @property interaction - The interaction of the plot.
 */
export interface IPlot2D {
  type: "plot2d";
  id?: string;
  title?: string;
  xAxisLabel?: string;
  xAxisVar?: string;
  xRange?: [number, number];
  xAxisInterval?: number;
  xAxisPos?: "center" | "edge";
  xLabelPos?: "center" | "right"; // Position of x-axis label along the axis line
  xGrid?: "show" | "hide"; // Grid visibility for x-axis, default is "show"
  yAxisLabel?: string;
  yAxisVar?: string;
  yRange?: [number, number];
  yAxisInterval?: number;
  yAxisPos?: "center" | "edge"; // "center" = y-axis at x=0, "edge" = y-axis at left
  yLabelPos?: "center" | "top"; // Position of y-axis label along the axis line
  yGrid?: "show" | "hide"; // Grid visibility for y-axis, default is "show"
  vectors?: IVector[];
  graphs?: I2DConfig[];
  width?: number | string;
  height?: number | string;
  tickFontSize?: number;
  interaction?: ["horizontal-drag" | "vertical-drag", string];
}
