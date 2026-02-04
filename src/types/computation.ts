import { IData2DFn, IData3DFn } from "./graph";

/**
 * Step function type for step-through debugging.
 */
export type IStepFn = (config: any, blockId?: string) => void;

/**
 * Context object passed to semantics functions.
 * Users can destructure only the properties they need.
 * @property vars - Proxy object for reading/writing variable values
 * @property data2d - Function to collect 2D visualization data points: data2d("id", {x, y})
 * @property data3d - Function to collect 3D visualization data points: data3d("id", {x, y, z})
 * @property step - Function for step-through debugging breakpoints
 */
export interface ISemanticsContext {
  vars: Record<string, any>;
  data2d: IData2DFn;
  data3d: IData3DFn;
  step: IStepFn;
}

/**
 * Semantics function type.
 * Receives a context object with variable values and data collection functions.
 * Users can destructure only what they need: ({ vars, data2d }) => { ... }
 */
export type ISemantics = (ctx: ISemanticsContext) => void;
