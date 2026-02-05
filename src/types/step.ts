import { IValue } from "./variable";

/**
 * A single formula's view data
 * @property description - The description text to display
 * @property values - Array of [varId, value] tuples mapping LaTeX variable IDs to runtime values
 * @property expression - Optional expression scope for bounding box highlighting
 */
export interface IView {
  description: string;
  values?: Array<[string, IValue]>;
  expression?: string;
}

/**
 * Step input: either a single view (applies to all formulas) or multiple views keyed by formulaId
 * - Single: { description: "...", values: [...], expression: "..." }
 * - Multi-formula: { "formula-id": { description: "...", ... }, "other-id": { ... } }
 */
export type IStepInput = IView | Record<string, IView>;

/**
 * Step structure created by step() calls
 * @property id - Optional step-level identifier (from second parameter)
 * @property formulas - Record of formula views keyed by formulaId (empty string '' means all formulas)
 */
export interface IStep {
  id?: string;
  formulas: Record<string, IView>;
}

/**
 * A collected step from reactive data collection during semantics execution.
 * Used by the new reactive step system (similar to plot2d/plot3d pattern).
 * @property index - Execution order (0, 1, 2...)
 * @property id - Optional step identifier (from second parameter of step() call)
 * @property description - The description text to display
 * @property values - Array of [varId, value] tuples mapping variable IDs to runtime values
 * @property expression - Optional expression scope for bounding box highlighting
 * @property formulas - Optional per-formula views for multi-formula steps
 * @property points2d - Map of graph ID to 2D point captured at this step (for step-dependent visualization)
 */
export interface ICollectedStep {
  index: number;
  id?: string;
  description: string;
  values?: Array<[string, IValue]>;
  expression?: string;
  formulas?: Record<string, IView>;
  points2d?: Record<string, { x: number; y: number }>;
}

