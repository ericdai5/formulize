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
import { IValue, IVariable } from "../types/variable";

/**
 * Result from engine execution including variable values and graph dataPoints.
 * @property {Record<string, IValue>} values - Computed variable values after execution
 * @property {Map<string, IDataPoint[]>} dataPointMap - dataPoints captured by data2d/data3d calls, keyed by graph ID
 */
export interface IManualEngineResult {
  values: Record<string, IValue>;
  dataPointMap: Map<string, IDataPoint[]>;
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
): Record<string, any> {
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
  stepFn: (config: any, blockId?: string) => void
): void {
  // Create proxy that directly mutates variable values
  const vars = createValueProxy(variables);
  // Execute the semantic function - mutations go directly to variables
  // Pass data3d, data2d, and step functions
  semanticFn(vars, data3dFn, data2dFn, stepFn);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Computes the formula with the given variable values using a custom JavaScript function.
 * Variables should already be normalized (typically from the computation store).
 * The semantic function mutates the vars object directly to set computed values.
 *
 * @param variables - Record of variable definitions with current values
 * @param semanticFn - The semantic function to execute
 * @returns Object containing computed values and collected graph dataPoints
 */
export function computeWithManualEngine(
  variables: Record<string, IVariable>,
  semanticFn?: ISemantics
): IManualEngineResult {
  // Collect graph dataPoints during execution
  const dataPointMap = new Map<string, IDataPoint[]>();
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
    // No-op step function for normal (non-interpreter) execution
    const step = () => {};
    executeSemanticFunction(semanticFn, variables, data3dFn, data2dFn, step);
    return {
      values: collectResults(variables),
      dataPointMap,
    };
  } catch (error) {
    console.error("Error computing with semantic function:", error);
    return emptyResult;
  }
}
