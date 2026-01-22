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
 * @property: color - The color of the line.
 * @property: lineWidth - The width of the line.
 * @property: name - The name of the line.
 * @property: showInLegend - Whether to show the line in the legend.
 * @property: yAxis - The y-axis variable for this specific line. If not provided, uses the plot's yAxis.
 */
export interface ILine {
  color?: string;
  lineWidth?: number;
  name?: string;
  showInLegend?: boolean;
  yAxis?: string;
}

/**
 * @property: xValue - The x-value expression (can be a variable name or expression).
 * @property: yValue - The y-value expression (can be a variable name or expression).
 * @property: persistence - Whether the point persists across updates or is removed.
 * @property: color - The color of the point.
 * @property: size - The size of the point.
 * @property: label - The label to display.
 */
export interface IStepPoint {
  xValue: string;
  yValue: string;
  persistence?: boolean;
  color?: string;
  size?: number;
  label?: string;
}

/**
 * @property: type - The type of the plot.
 * @property: id - The id of the plot.
 * @property: title - The title of the plot.
 * @property: xAxis - The x-axis variable for the plot.
 * @property: xRange - The range of the x-axis.
 * @property: xAxisInterval - The interval of the x-axis.
 * @property: xAxisPos - The position of the x-axis. "center" = x-axis at y=0, "edge" = x-axis at bottom
 * @property: xGrid - The grid visibility for the x-axis.
 * @property: yAxis - The y-axis variable for the plot.
 * @property: yRange - The range of the y-axis.
 * @property: yAxisInterval - The interval of the y-axis.
 * @property: yAxisPos - The position of the y-axis.
 * @property: yGrid - The grid visibility for the y-axis.
 * @property: vectors - The vectors for the plot.
 * @property: lines - The lines for the plot.
 * @property: width - The width of the plot.
 * @property: height - The height of the plot.
 * @property: tickFontSize - The font size of the ticks.
 * @property: interaction - The interaction of the plot.
 * @property: stepPoints - The step points for the plot.
 */
export interface IPlot2D {
  type: "plot2d";
  id?: string;
  title?: string;
  xAxis?: string;
  xRange?: [number, number];
  xAxisInterval?: number;
  xAxisPos?: "center" | "edge";
  xLabelPos?: "center" | "right"; // Position of x-axis label along the axis line
  xGrid?: "show" | "hide"; // Grid visibility for x-axis, default is "show"
  yAxis?: string;
  yRange?: [number, number];
  yAxisInterval?: number;
  yAxisPos?: "center" | "edge"; // "center" = y-axis at x=0, "edge" = y-axis at left
  yLabelPos?: "center" | "top"; // Position of y-axis label along the axis line
  yGrid?: "show" | "hide"; // Grid visibility for y-axis, default is "show"
  vectors?: IVector[];
  lines?: ILine[];
  width?: number | string;
  height?: number | string;
  tickFontSize?: number;
  interaction?: ["horizontal-drag" | "vertical-drag", string];
  /** Render points at specific steps/views. Key format: "viewId" or "viewId.pointId" for multiple points per view */
  stepPoints?: Record<string, IStepPoint | IStepPoint[]>;
}
