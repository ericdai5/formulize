export interface IPlot2D {
  type: "plot2d";
  id?: string;
  title?: string;
  xVar?: string;
  xRange?: [number, number];
  yVar?: string;
  yRange?: [number, number];
  traces?: any[];
  width?: number | string;
  height?: number | string;
}
