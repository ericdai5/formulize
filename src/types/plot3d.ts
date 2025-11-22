export interface IPlot3D {
  type: "plot3d";
  id?: string;
  title?: string;
  xAxis: string;
  xRange?: [number, number];
  yAxis: string;
  yRange?: [number, number];
  zVar: string;
  zRange?: [number, number];
  width?: number | string;
  height?: number | string;
  plotType?: "scatter" | "surface" | "line" | "mesh";
  showCurrentPointInLegend?: boolean;
  surfaces?: {
    id: string;
    color?: string | string[];
    opacity?: number;
    showInLegend?: boolean;
    showColorbar?: boolean;
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
  id: string; // Changed from id to id
  color?: string | string[];
  opacity?: number;
  showInLegend?: boolean;
  showColorbar?: boolean;
  matrixData?: ISurfaceCoord | null;
  points?: IPoint3D[];
}
