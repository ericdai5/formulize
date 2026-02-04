/**
 * Types for data2d() and data3d() functions used in manual computation.
 * Allows imperative collection of visualization data points.
 */

/**
 * A snapshot of coordinate values at the time of a data2d/data3d call.
 */
export type IDataPoint = Record<string, number>;

/**
 * 2D coordinate values for data2d() calls.
 * @property {number} x - X coordinate value
 * @property {number} y - Y coordinate value
 */
export interface IData2D {
  x: number;
  y: number;
}

/**
 * 3D coordinate values for data3d() calls.
 * @property {number} x - X coordinate value
 * @property {number} y - Y coordinate value
 * @property {number} z - Z coordinate value
 */
export interface IData3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Collected graph data for a single graph ID.
 * Contains all dataPoints collected during manual function execution.
 * @property {string} id - Unique identifier for this graph
 * @property {IDataPoint[]} dataPoints - Array of collected coordinate dataPoints
 * @example { id: "curve", dataPoints: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }
 */
export interface IData {
  id: string;
  dataPoints: IDataPoint[];
}

/**
 * Function to store 2D data points for visualization.
 * @param id - Unique identifier for the graph/visualization
 * @param values - Explicit coordinate values {x, y}
 * @example data2d("curve", {x: vars.x, y: vars.y})
 */
export type IData2DFn = (id: string, values: IData2D) => void;

/**
 * Function to store 3D data points for visualization.
 * @param id - Unique identifier for the graph/visualization
 * @param values - Explicit coordinate values {x, y, z}
 * @example data3d("surface", {x: vars.x, y: vars.y, z: vars.z})
 */
export type IData3DFn = (id: string, values: IData3D) => void;
