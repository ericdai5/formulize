export interface IPlot3D {
  type: "plot3d";
  id?: string;
  title?: string;
  xAxisVar: string;
  xRange?: [number, number];
  yAxisVar: string;
  yRange?: [number, number];
  zVar: string;
  zRange?: [number, number];
  width?: number | string;
  height?: number | string;
  plotType?: "scatter" | "surface" | "line" | "mesh";
  showCurrentPointInLegend?: boolean;
  surfaces?: {
    formulaId: string; // Changed from formulaId to formulaId
    color?: string | string[];
    opacity?: number;
    showInLegend?: boolean;
    showColorbar?: boolean;
  }[];
  lines?: {
    name: string;
    surfaceIntersection?: {
      surface1: string; // These should also be formulaIds
      surface2: string; // These should also be formulaIds
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
  formulaId: string; // Changed from formulaId to formulaId
  color?: string | string[];
  opacity?: number;
  showInLegend?: boolean;
  showColorbar?: boolean;
  matrixData?: ISurfaceCoord | null;
  points?: IPoint3D[];
}
