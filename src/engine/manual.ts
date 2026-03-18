/**
 * Computation Engine for Formulize
 *
 * This module provides computation capability allowing authors to define
 * custom JavaScript functions for computing variables via mutation.
 *
 * @module engine/manual
 */
import { ISemantics } from "../types/computation";
import { ISampleFn, IDataPoint, IDataValues } from "../types/graph";
import { ICollectedStep, IStepInput, IView } from "../types/step";
import { IValue, IVariable } from "../types/variable";
import { latex } from "../util/step-label-format";

/**
 * Function signature for step collection during semantics execution.
 * Matches the step() API signature used in semantics functions.
 */
export type IStepFn = (input: IStepInput, id?: string) => void;

/**
 * Result from engine execution including variable values and graph dataPoints.
 * @property {Record<string, IValue>} values - Computed variable values after execution
 * @property {Map<string, IDataPoint[]>} dataPointMap - dataPoints captured by sample() calls, keyed by graph ID
 * @property {ICollectedStep[]} stepList - Steps collected during execution via step() calls
 */
export interface IManualEngineResult {
  values: Record<string, IValue>;
  dataPointMap: Map<string, IDataPoint[]>;
  stepList: ICollectedStep[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Creates a Proxy that allows direct mutation of variable values.
 * Reading `vars.K` returns `variables.K.value`
 * Writing `vars.K = 10` directly sets `variables.K.value = 10`
 */
function createValueProxy(
  variables: Record<string, IVariable>
): Record<string, IValue | undefined> {
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        return variables[prop]?.value;
      },
      set(_target, prop: string, value) {
        if (variables[prop]) {
          variables[prop].value = value;
        }
        return true;
      },
      // Support Object.keys(), Object.entries(), etc.
      ownKeys() {
        return Object.keys(variables);
      },
      getOwnPropertyDescriptor(_target, prop: string) {
        if (prop in variables) {
          return {
            enumerable: true,
            configurable: true,
            value: variables[prop]?.value,
          };
        }
        return undefined;
      },
    }
  );
}

// ============================================================================
// Result Collection
// ============================================================================

function collectResults(
  variables: Record<string, IVariable>
): Record<string, IValue> {
  const result: Record<string, IValue> = {};
  for (const [varName, variable] of Object.entries(variables)) {
    if (variable.value !== undefined) {
      result[varName] = variable.value;
    }
  }
  return result;
}

// ============================================================================
// Semantic Function Execution
// ============================================================================

function executeSemanticFunction(
  semanticFn: ISemantics,
  variables: Record<string, IVariable>,
  sampleFn: ISampleFn,
  stepFn: IStepFn
): void {
  // Create proxy that directly mutates variable values
  const vars = createValueProxy(variables);
  // Execute the semantic function with context object
  // Users destructure what they need: ({ vars, sample }) => { ... }
  semanticFn({
    vars,
    sample: sampleFn,
    step: stepFn,
    latex,
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Helper to check if input is a single view.
 * With optional description, single-view inputs may only contain `labels`.
 */
function isSingleView(input: IStepInput): input is IView {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }
  const view = input as Record<string, unknown>;
  return (
    Object.prototype.hasOwnProperty.call(view, "description") ||
    Object.prototype.hasOwnProperty.call(view, "labels") ||
    Object.keys(view).length === 0
  );
}

/**
 * Create a step collector function that collects steps during semantics execution.
 * This follows the reactive data collection pattern similar to sample().
 *
 * @param stepList - The array to collect steps into
 * @returns A step function that can be called from semantics
 */
function createStepCollector(stepList: ICollectedStep[]): IStepFn {
  return (input: IStepInput, id?: string) => {
    if (isSingleView(input)) {
      // Single view mode - applies to all formulas
      // Use empty string key "" to indicate "all formulas"
      stepList.push({
        index: stepList.length,
        id,
        description: input.description ?? "",
        labels: input.labels,
        formulas: { "": input },
      });
    } else {
      // Multi-formula mode - input is Record<string, IView>
      // For multi-formula steps, we still create a single collected step
      // but store the per-formula views in the formulas field
      const firstView = Object.values(input)[0];
      stepList.push({
        index: stepList.length,
        id,
        description: firstView?.description ?? "",
        labels: firstView?.labels,
        formulas: input as Record<string, IView>,
      });
    }
  };
}

/**
 * Computes the formula with the given variable values using a custom JavaScript function.
 * Variables should already be normalized (typically from the computation store).
 * The semantic function mutates the vars object directly to set computed values.
 *
 * @param variables - Record of variable definitions with current values
 * @param semanticFn - The semantic function to execute
 * @param collectSteps - Whether to collect step() calls (default: false for backward compatibility)
 * @returns Object containing computed values, collected graph dataPoints, and step list
 */
export function computeWithManualEngine(
  variables: Record<string, IVariable>,
  semanticFn?: ISemantics,
  collectSteps: boolean = false
): IManualEngineResult {
  // Collect graph dataPoints during execution
  const dataPointMap = new Map<string, IDataPoint[]>();
  // Collect steps during execution (when enabled)
  const stepList: ICollectedStep[] = [];
  // Create sampling function for 2D/3D visualization data
  // Usage: sample("id", {x, y, z?})
  const sampleFn: ISampleFn = (id: string, values: IDataValues) => {
    let dataPoints = dataPointMap.get(id);
    if (!dataPoints) {
      dataPoints = [];
      dataPointMap.set(id, dataPoints);
    }
    const dataPoint: IDataPoint = { x: values.x, y: values.y };
    if (typeof values.z === "number") {
      dataPoint.z = values.z;
    }
    dataPoints.push(dataPoint);
  };
  const emptyResult: IManualEngineResult = {
    values: {},
    dataPointMap: new Map(),
    stepList: [],
  };
  try {
    if (!variables || Object.keys(variables).length === 0) {
      console.warn("⚠️ No variables provided");
      return emptyResult;
    }
    if (!semanticFn) {
      console.warn("⚠️ No semantic function provided for computation");
      return emptyResult;
    }
    // Create step function - either collector or no-op based on collectSteps flag
    const stepFn: IStepFn = collectSteps
      ? createStepCollector(stepList)
      : () => {};
    executeSemanticFunction(
      semanticFn,
      variables,
      sampleFn,
      stepFn
    );
    return {
      values: collectResults(variables),
      dataPointMap,
      stepList,
    };
  } catch (error) {
    console.error("Error computing with semantic function:", error);
    return emptyResult;
  }
}
