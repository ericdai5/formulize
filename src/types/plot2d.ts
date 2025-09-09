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
  formulaId?: string; // Links this visualization to a specific formula
  title?: string;
  xAxisVar?: string;
  xRange?: [number, number];
  yAxisVar?: string;
  yRange?: [number, number];
  vectors?: IVector[];
  lines?: ILine[];
  width?: number | string;
  height?: number | string;
  tickFontSize?: number;
}
