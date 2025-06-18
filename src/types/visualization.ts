import { ICustom } from "./custom";
import { IPlot2D } from "./plot2d";
import { IPlot3D } from "./plot3d";

export type IVisualization = IPlot2D | IPlot3D | ICustom;
