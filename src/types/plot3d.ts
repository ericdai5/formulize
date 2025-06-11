export interface IPlot3D {
  type: "plot3d";
  id?: string;
  title?: string;
  xVar: string;
  xRange?: [number, number];
  yVar: string;
  yRange?: [number, number];
  zVar: string;
  zRange?: [number, number];
  width?: number | string;
  height?: number | string;
  plotType?: "scatter" | "surface" | "line" | "mesh";
  surfaces?: {
    formulaName: string;
    color?: string | string[];
    opacity?: number;
    showInLegend?: boolean;
  }[];
  lines?: {
    name: string;
    surfaceIntersection?: {
      surface1: string;
      surface2: string;
    };
    color?: string;
    width?: number;
    showInLegend?: boolean;
  }[];
}

export interface IPoint3D {
  x: number;
  y: number;
  z: number | null;
}

export interface ISurfaceCoord {
  xCoords: number[];
  yCoords: number[];
  zCoords: (number | null)[][];
}

export interface ISurface {
  formulaName: string;
  color?: string | string[];
  opacity?: number;
  showInLegend?: boolean;
  matrixData?: ISurfaceCoord | null;
  points?: IPoint3D[];
}
