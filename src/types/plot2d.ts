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

export interface ILine {
  color?: string;
  lineWidth?: number;
  name?: string;
  showInLegend?: boolean;
}

export interface IPlot2D {
  type: "plot2d";
  id?: string;
  title?: string;
  xAxisVar?: string;
  xRange?: [number, number];
  xAxisInterval?: number;
  xAxisPos?: "center" | "edge"; // "center" = x-axis at y=0, "edge" = x-axis at bottom
  xLabelPos?: "center" | "right"; // Position of x-axis label along the axis line
  yAxisVar?: string;
  yRange?: [number, number];
  yAxisInterval?: number;
  yAxisPos?: "center" | "edge"; // "center" = y-axis at x=0, "edge" = y-axis at left
  yLabelPos?: "center" | "top"; // Position of y-axis label along the axis line
  vectors?: IVector[];
  lines?: ILine[];
  width?: number | string;
  height?: number | string;
  tickFontSize?: number;
  interaction?: ["horizontal-drag" | "vertical-drag", string];
}
