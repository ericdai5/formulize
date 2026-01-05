/**
 * Auto-detection utilities for Plot2D configuration
 * Automatically infers axes and ranges from computation store variables
 *
 * ## Features:
 * - **xAxis**: Automatically defaults to the first "input" variable
 * - **yAxis**: Automatically defaults to the first "computed" variable
 * - **xRange**: Automatically inferred from the input variable's range property
 * - **yRange**: Automatically computed by sampling the computed variable across the x-range
 *
 * All axes and ranges are auto-detected from variable definitions!
 */
import { ComputationStore } from "../../store/computation";
import { IPlot2D } from "../../types/plot2d";
import { PLOT2D_DEFAULTS } from "./defaults";

interface AutoDetectedConfig {
  xAxis: string | undefined;
  yAxis: string | undefined;
  xRange: [number, number];
  yRange: [number, number];
}

/**
 * Auto-detect plot configuration from computation store variables
 * - xAxis defaults to first input variable
 * - yAxis defaults to first computed variable
 * - xRange inferred from input variable's range
 * - yRange computed by sampling yAxis across xRange
 * @param config - The plot configuration
 * @param computationStore - The computation store to use
 */
export function autoDetectPlotConfig(
  config: IPlot2D,
  computationStore: ComputationStore
): AutoDetectedConfig {
  // Get all variables from computation store
  const variables = Array.from(computationStore.variables.entries());
  // Find first input and computed variables
  const firstInputVar = variables.find(([, v]) => v.role === "input");
  const firstComputedVar = variables.find(([, v]) => v.role === "computed");
  // Auto-detect xAxis (use first input variable if not specified)
  const xAxis = config.xAxis || (firstInputVar ? firstInputVar[0] : undefined);
  // Auto-detect yAxis (use first computed variable if not specified)
  const yAxis =
    config.yAxis || (firstComputedVar ? firstComputedVar[0] : undefined);
  // Auto-detect xRange from input variable's range
  let xRange: [number, number] = config.xRange || PLOT2D_DEFAULTS.xRange;
  if (!config.xRange && xAxis) {
    const xVariable = computationStore.variables.get(xAxis);
    if (xVariable?.range) {
      xRange = xVariable.range;
    }
  }
  // Auto-detect yRange by sampling computed variable across xRange
  let yRange: [number, number] = config.yRange || PLOT2D_DEFAULTS.yRange;
  if (!config.yRange && xAxis && yAxis) {
    yRange = computeYRange(xAxis, yAxis, xRange, computationStore);
  }
  return {
    xAxis,
    yAxis,
    xRange,
    yRange,
  };
}

/**
 * Generate all combinations of min/max values for input variables
 */
function generateExtremeCombinations(
  vars: Array<{ id: string; range: [number, number] }>
): Array<Record<string, number>> {
  if (vars.length === 0) return [{}];
  if (vars.length === 1) {
    const [min, max] = vars[0].range;
    return [{ [vars[0].id]: min }, { [vars[0].id]: max }];
  }
  // For multiple variables, sample at corners (min/max combinations)
  const combinations: Array<Record<string, number>> = [];
  const numVars = vars.length;
  const numCombos = Math.pow(2, numVars);
  for (let i = 0; i < numCombos; i++) {
    const combo: Record<string, number> = {};
    for (let j = 0; j < numVars; j++) {
      const [min, max] = vars[j].range;
      // Use binary representation to pick min or max
      combo[vars[j].id] = i & (1 << j) ? max : min;
    }
    combinations.push(combo);
  }
  return combinations;
}

/**
 * Compute y-axis range by sampling the computed variable across x-range
 * Takes 100 samples across the x-range and finds exact min/max y values
 * Samples at the extremes (min/max) of all other input variables
 * to ensure the y-range captures the full envelope of possible values
 * No padding is added - the range is exactly what the function produces
 */
function computeYRange(
  xAxis: string,
  yAxis: string,
  xRange: [number, number],
  computationStore: ComputationStore
): [number, number] {
  const evaluationFunction = computationStore.evaluateFormula;
  if (!evaluationFunction) {
    return PLOT2D_DEFAULTS.yRange;
  }
  const [xMin, xMax] = xRange;
  const numSamples = 100;
  const step = (xMax - xMin) / numSamples;
  let yMin = Infinity;
  let yMax = -Infinity;
  // Get all other input variables (excluding xAxis)
  const otherInputVars: Array<{ id: string; range: [number, number] }> = [];
  for (const [varId, variable] of computationStore.variables.entries()) {
    if (varId !== xAxis && variable.role === "input" && variable.range) {
      otherInputVars.push({ id: varId, range: variable.range });
    }
  }
  // Generate all extreme combinations of other input variables
  const extremeCombos = generateExtremeCombinations(otherInputVars);
  // Sample y values across x range for each combination
  for (let i = 0; i <= numSamples; i++) {
    const xValue = xMin + i * step;
    for (const combo of extremeCombos) {
      try {
        const variableValues: Record<string, number> = {
          ...combo,
          [xAxis]: xValue,
        };
        // Add any constant/computed variable values
        for (const [varId, variable] of computationStore.variables.entries()) {
          if (
            !(varId in variableValues) &&
            typeof variable.value === "number"
          ) {
            variableValues[varId] = variable.value;
          }
        }
        // Evaluate
        const results = evaluationFunction(variableValues);
        const yValue = results[yAxis];
        if (typeof yValue === "number" && !isNaN(yValue) && isFinite(yValue)) {
          yMin = Math.min(yMin, yValue);
          yMax = Math.max(yMax, yValue);
        }
      } catch (error) {
        // Skip this sample if evaluation fails
        continue;
      }
    }
  }
  // If we couldn't compute any valid values, use defaults
  if (!isFinite(yMin) || !isFinite(yMax)) {
    return PLOT2D_DEFAULTS.yRange;
  }
  // Handle case where all y values are the same
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  return [yMin, yMax];
}
