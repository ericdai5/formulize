import { IData2DFn, IData3DFn } from "./graph";

/**
 * Step function type for step-through debugging.
 */
export type IStepFn = (config: any, blockId?: string) => void;

/**
 * Semantics function type.
 * Receives all variable values and data collection functions for visualization.
 * @param vars - Proxy object for reading/writing variable values
 * @param data3d - Function to collect 3D visualization data points: data3d("id", {x, y, z})
 * @param data2d - Function to collect 2D visualization data points: data2d("id", {x, y})
 * @param step - Function for step-through debugging breakpoints
 */
export type ISemantics = (
  vars: Record<string, any>,
  data3d: IData3DFn,
  data2d: IData2DFn,
  step: IStepFn
) => any;
