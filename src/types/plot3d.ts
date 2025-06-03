export interface IPlot3D {
  type: "plot3d";
  title?: string;
  xAxis: {
    variable: string;
    label?: string;
    min?: number;
    max?: number;
  };
  yAxis: {
    variable: string;
    label?: string;
    min?: number;
    max?: number;
  };
  zAxis: {
    variable: string;
    label?: string;
    min?: number;
    max?: number;
  };
  width?: number | string;
  height?: number | string;
  plotType?: "scatter" | "surface" | "line" | "mesh";
  id?: string;
}
