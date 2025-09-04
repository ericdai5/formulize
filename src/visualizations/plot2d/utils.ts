import { getVariable } from "../../util/computation-helpers";

export interface PlotDimensions {
  plotWidth: number;
  plotHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

/**
 * Calculates plot dimensions based on config
 */
export function calculatePlotDimensions(
  width: number | string,
  height: number | string
): PlotDimensions {
  const margin = { top: 50, right: 50, bottom: 60, left: 70 };
  const numWidth =
    typeof width === "number" ? width : parseInt(width as string, 10);
  const numHeight =
    typeof height === "number" ? height : parseInt(height as string, 10);
  const plotWidth = numWidth - margin.left - margin.right;
  const plotHeight = numHeight - margin.top - margin.bottom;
  return { plotWidth, plotHeight, margin };
}

/**
 * Gets variable precision for formatting
 */
export function getVariablePrecision(variableName: string): number {
  const variable = getVariable(variableName);
  return variable?.precision ?? 2;
}

/**
 * Formats a number with variable-specific precision
 */
export function formatVariableValue(
  value: number,
  variableName: string
): string {
  const precision = getVariablePrecision(variableName);
  return value.toFixed(precision);
}

/**
 * Gets variable label from computation store
 */
export function getVariableLabel(variableName: string): string {
  const variable = getVariable(variableName);
  return variable?.name || variableName;
}

/**
 * Calculates appropriate number of samples for smooth curves
 */
export function calculateSampleCount(plotWidthPx: number): number {
  const SAMPLE_DENSITY = 5; // samples per pixel for high resolution
  const MIN_SAMPLES = 500; // Minimum number of samples for any plot
  const samples = Math.ceil(SAMPLE_DENSITY * plotWidthPx);
  return Math.max(samples, MIN_SAMPLES);
}
