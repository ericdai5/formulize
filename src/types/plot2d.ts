export interface IPlot2D {
  type: "plot2d";
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
  width?: number | string;
  height?: number | string;
}
