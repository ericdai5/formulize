import { IData2DFn, IData3DFn } from "./graph";

/**
 * Manual computation function type.
 * Receives all variable values and data collection functions for visualization.
 * @param vars - Proxy object for reading/writing variable values
 * @param data3d - Function to collect 3D visualization data points: data3d("id", {x, y, z})
 * @param data2d - Function to collect 2D visualization data points: data2d("id", {x, y})
 */
export type IManual = (
  vars: Record<string, any>,
  data3d: IData3DFn,
  data2d: IData2DFn
) => any;

export interface ISemantics {
  expressions?: Record<string, string>;
  manual?: IManual;
  mode?: "step" | "normal";
}
