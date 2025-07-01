export interface TraceConfig {
  x: (string | number)[];
  y: (string | number)[];
  shape?: "arrow" | "dash" | "point";
  color?: string;
  lineWidth?: number;
  markerSize?: number;
  name?: string;
  draggable?: boolean;
  showlegend?: boolean;
}

export interface IPlot2D {
  type: "plot2d";
  id?: string;
  title?: string;
  xVar?: string;
  xRange?: [number, number];
  yVar?: string;
  yRange?: [number, number];
  traces?: TraceConfig[];
  width?: number | string;
  height?: number | string;
}
