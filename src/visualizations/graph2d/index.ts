// Main Plot2D component
export { default as Plot2D } from "./graph-2d";
export type { DataPoint } from "./graph-2d";

// Defaults and configuration
export * from "./defaults";

// Utility modules for extending functionality
export * from "./axes";
export * from "./markers";
export * from "./vectors";
export * from "./utils";

// Sampling API for interactive line/point/surface data access
export {
  sample2DLine,
  sample2DPoint,
  sample3DLine,
  sample3DPoint,
  sampleSurface,
  getVariableRange,
} from "./sampling-api";
export type {
  LineSampleConfig,
  PointSampleConfig,
  SurfaceSampleConfig,
  DataPoint3D,
} from "./sampling-api";
