import { IValue } from "./variable";

/**
 * A highlight of the code
 * @property start - The start index of the highlight
 * @property end - The end index of the highlight
 */
export interface IHighlight {
  start: number;
  end: number;
}

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
 * Configuration for an extension object type that defines items to be added
 * based on viewId matching and optional persistence.
 */
export interface IObject {
  /** The extension key (e.g., "stepPoints") */
  key: string;
  /** Array of item configs, each with viewId, persistence, and data */
  items: Array<{
    viewId: string;
    /** Optional step index to target a specific step instead of all steps with matching viewId */
    index?: number;
    persistence?: boolean;
    /** The data to store */
    data: Record<string, unknown>;
  }>;
}

/**
 * A step in the execution of the code
 * @property index - The interpreter step number
 * @property highlight - The highlight of the code
 * @property variables - The variables in the step
 * @property stackTrace - The stack trace of the step
 * @property timestamp - The timestamp of the step
 * @property step - The user created step
 * @property extensions - Generic storage for visualization extensions (keyed by extension type, each containing an array of items)
 */
export interface IInterpreterStep {
  index: number;
  highlight: IHighlight;
  variables: Record<string, unknown>;
  stackTrace: string[];
  timestamp: number;
  step?: IStep;
  extensions?: Record<string, IObject["items"]>;
}
