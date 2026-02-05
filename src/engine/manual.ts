/**
 * Computation Engine for Formulize
 *
 * This module provides computation capability allowing authors to define
 * custom JavaScript functions for computing variables via mutation.
 *
 * @module engine/manual
 */
import { ISemantics } from "../types/computation";
import {
  IData2D,
  IData2DFn,
  IData3D,
  IData3DFn,
  IDataPoint,
} from "../types/graph";
import { ICollectedStep, IStepInput, IView } from "../types/step";
import { IValue, IVariable } from "../types/variable";

/**
 * Function signature for step collection during semantics execution.
 * Matches the step() API signature used in semantics functions.
 */
export type IStepFn = (input: IStepInput, id?: string) => void;

/**
 * Result from engine execution including variable values and graph dataPoints.
 * @property {Record<string, IValue>} values - Computed variable values after execution
 * @property {Map<string, IDataPoint[]>} dataPointMap - dataPoints captured by data2d/data3d calls, keyed by graph ID
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
  data3dFn: IData3DFn,
  data2dFn: IData2DFn,
  stepFn: IStepFn
): void {
  // Create proxy that directly mutates variable values
  const vars = createValueProxy(variables);
  // Execute the semantic function with context object
  // Users destructure what they need: ({ vars, data2d }) => { ... }
  semanticFn({
    vars,
    data2d: data2dFn,
    data3d: data3dFn,
    step: stepFn,
  });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Helper to check if input is a single view (has 'description' property)
 */
function isSingleView(input: IStepInput): input is IView {
  return typeof input === "object" && "description" in input;
}

/**
 * Create a step collector function that collects steps during semantics execution.
 * This follows the reactive data collection pattern similar to data2d/data3d.
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
        description: input.description,
        values: input.values,
        expression: input.expression,
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
        values: firstView?.values,
        expression: firstView?.expression,
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
  // Create data3d function for 3D visualization data
  // Usage: data3d("id", {x, y, z})
  const data3dFn: IData3DFn = (id: string, values: IData3D) => {
    let dataPoints = dataPointMap.get(id);
    if (!dataPoints) {
      dataPoints = [];
      dataPointMap.set(id, dataPoints);
    }
    dataPoints.push({ x: values.x, y: values.y, z: values.z });
  };
  // Create data2d function for 2D visualization data
  // Usage: data2d("id", {x, y})
  const data2dFn: IData2DFn = (id: string, values: IData2D) => {
    let dataPoints = dataPointMap.get(id);
    if (!dataPoints) {
      dataPoints = [];
      dataPointMap.set(id, dataPoints);
    }
    dataPoints.push({ x: values.x, y: values.y });
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
    executeSemanticFunction(semanticFn, variables, data3dFn, data2dFn, stepFn);
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
