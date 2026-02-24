import { IValue } from "./variable";

/**
 * A single formula's view data
 * @property description - Optional description text to display
 * @property labels - Record of label entries keyed by LaTeX variable IDs or expression scopes
 */
export interface IView {
  description?: string;
  labels?: IStepLabels;
}

/**
 * Step input: either a single view (applies to all formulas) or multiple views keyed by formulaId
 * - Single: { description?: "...", labels?: {...} }
 * - Multi-formula: { "formula-id": { description?: "...", labels?: {...} }, "other-id": { ... } }
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
 * @property labels - Record of label entries keyed by variable IDs or expression scopes
 * @property formulas - Optional per-formula views for multi-formula steps
 */
export interface ICollectedStep {
  index: number;
  id?: string;
  description: string;
  labels?: IStepLabels;
  formulas?: Record<string, IView>;
}
