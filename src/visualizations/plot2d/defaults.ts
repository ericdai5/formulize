/**
 * Default configuration values for Plot2D API parameters
 */

export const PLOT2D_DEFAULTS = {
  width: 500,
  height: 500,
  xRange: [0, 10] as [number, number],
  yRange: [0, 100] as [number, number],
} as const;

export const VECTOR_DEFAULTS = {
  shape: "arrow" as const,
  color: "#4169E1",
  lineWidth: 2,
  markerSize: 4,
  draggable: true,
  showlegend: true,
  // Label defaults (only used when label is explicitly provided)
  labelPosition: "mid" as const,
  labelOffsetX: 12,
  labelOffsetY: -12,
  labelColor: undefined, // Will inherit vector color
  labelFontSize: 12,
} as const;
