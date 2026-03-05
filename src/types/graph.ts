/**
 * Types for sample() functions used in manual computation.
 * Allows imperative collection of visualization data points.
 */

/**
 * A snapshot of coordinate values at the time of a sample() call.
 */
export type IDataPoint = Record<string, number>;

/**
 * Coordinate values for sample() calls.
 * @property {number} x - X coordinate value
 * @property {number} y - Y coordinate value
 * @property {number} z - Optional Z coordinate value
 */
export interface IDataValues {
  x: number;
  y: number;
  z?: number;
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
 * Function to store visualization data points (2D/3D).
 * @param id - Unique identifier for the graph/visualization
 * @param values - Explicit coordinate values {x, y, z?}
 * @example sample("curve", {x: vars.x, y: vars.y})
 * @example sample("surface", {x: vars.x, y: vars.y, z: vars.z})
 */
export type ISampleFn = (id: string, values: IDataValues) => void;
