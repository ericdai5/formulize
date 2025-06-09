import { IPlot2D } from "./plot2d";
import { IPlot3D } from "./plot3d";

export interface IVisualization {
  type: "plot2d" | "plot3d" | string;
  config: IPlot2D | IPlot3D;
  id?: string;
}
