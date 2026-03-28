/**
 * Vector configuration.
 * @property startSampleId - Sample ID for vector start point. Must match sample(sampleId, {x, y}) in semantics.
 * @property endSampleId - Sample ID for vector end point. Must match sample(sampleId, {x, y}) in semantics.
 * @property shape - Shape of the vector.
 * @property color - Color of the vector.
 * @property lineWidth - Width of the vector.
 * @property markerSize - Size of the vector.
 * @property name - Name of the vector.
 * @property draggable - Whether the vector is draggable.
 * @property showlegend - Whether to show the vector in the legend.
 * @property interaction - Optional [xVarId, yVarId] used for vector tip drag updates and hover highlighting.
 * @property label - Optional label for the vector.
 * @property labelPosition - Optional position of the label.
 * @property labelOffsetX - Optional offset of the label on the x-axis.
 * @property labelOffsetY - Optional offset of the label on the y-axis.
 * @property labelColor - Optional color of the label.
 * @property labelFontSize - Optional font size of the label.
 * @property stepId - Optional step ID that controls when this vector appears during stepping.
 *                    When set, the vector only appears after the step() call with matching id has been reached.
 * @property persistence - Controls vector visibility during stepping (default: true):
 *                         true = vector stays visible after its step (accumulate)
 *                         false = vector only visible at that exact step
 * @property curved - Optional curvature amount for the vector (default: 0 = straight line).
 *                    Positive values curve counterclockwise, negative values curve clockwise.
 *                    Typical range: -1 to 1, where 0.3-0.5 gives a gentle curve.
 */
export interface IVector {
  startSampleId: string;
  endSampleId: string;
  shape?: "arrow" | "dash" | "point";
  color?: string;
  lineWidth?: number;
  markerSize?: number;
  name?: string;
  draggable?: boolean;
  showlegend?: boolean;
  interaction?: [string, string];
  label?: string;
  labelPosition?: "start" | "mid" | "end";
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelColor?: string;
  labelFontSize?: number;
  stepId?: string;
  persistence?: boolean;
  curved?: number;
}

/**
 * Base configuration for graph-based 2D visualizations.
 * Uses explicit sample() calls in manual functions to collect coordinates.
 * @property: sampleId - Sample ID to match sample() calls in manual function (required)
 * @property: name - Display name for the legend
 * @property: showInLegend - Whether to show in legend
 */
interface I2DConfigBase {
  sampleId: string;
  name?: string;
  showInLegend?: boolean;
}

/**
 * Line graph: samples over a parameter variable to create a 2D line/curve.
 * The manual function must call sample(sampleId, {x, y}) to provide coordinates.
 * @property: parameter - The variable to vary during sampling (1 parameter for lines)
 * @property: range - Optional range to sample over the parameter (defaults to the variable's range)
 * @property: samples - Number of samples (default 100)
 * @property: color - Line color
 * @property: lineWidth - Line width
 * @property: interaction - Drag interaction: ["horizontal-drag" | "vertical-drag", variableName]
 */
export interface I2DLine extends I2DConfigBase {
  parameter: string;
  range?: [number, number];
  samples?: number;
  color?: string;
  lineWidth?: number;
  interaction?: ["horizontal-drag" | "vertical-drag", string];
}

/**
 * Point graph: shows the current point without sampling (0 parameters).
 * The manual function must call sample(sampleId, {x, y}) to provide coordinates.
 * @property color - Marker color
 * @property size - Marker size
 * @property showLabel - Whether to show label
 * @property interaction - Drag interaction: ["horizontal-drag" | "vertical-drag", variableName]
 * @property stepId - Optional step ID that controls when this point appears during stepping.
 *                    When set, the point only appears after the step() call with matching id has been reached.
 * @property persistence - Controls point visibility during stepping (default: true):
 *                         true = point stays visible after its step (accumulate)
 *                         false = point only visible at that exact step
 */
export interface I2DPoint extends I2DConfigBase {
  color?: string;
  size?: number;
  showLabel?: boolean;
  interaction?: ["horizontal-drag" | "vertical-drag", string];
  stepId?: string;
  persistence?: boolean;
}

export type I2DConfig = I2DLine | I2DPoint;

/**
 * Graph2D configuration.
 * @property id - The id of the graph.
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
 * @property vectors - Vector segments whose endpoints are resolved from sample() IDs.
 * @property lines - Line visualizations sampled from sample() calls.
 * @property points - Point visualizations sampled from sample() calls.
 *                    Points with stepId will only appear during stepping when that step is reached.
 * @property width - The width of the plot.
 * @property height - The height of the plot.
 * @property tickFontSize - The font size of the ticks.
 * @property interaction - The interaction of the plot.
 */
export interface IGraph2D {
  id: string;
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
  lines?: I2DLine[];
  points?: I2DPoint[];
  width?: number | string;
  height?: number | string;
  tickFontSize?: number;
  interaction?: ["horizontal-drag" | "vertical-drag", string];
}
