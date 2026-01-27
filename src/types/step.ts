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
 * A view that is created by a view() call
 * @property id - Optional unique identifier for the view
 * @property description - The description text to display
 * @property value - Optional value associated with the view
 * @property expression - Optional expression scope for bounding box around
 * expression and also active variables
 * @property formulaId - Optional formula ID to target specific formula component
 */
export interface IView {
  id?: string;
  description: string;
  value?: unknown;
  expression?: string;
  formulaId?: string;
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
 * @property step - The step number
 * @property highlight - The highlight of the code
 * @property variables - The variables in the step
 * @property stackTrace - The stack trace of the step
 * @property timestamp - The timestamp of the step
 * @property view - The view of the step
 * @property extensions - Generic storage for visualization extensions (keyed by extension type, each containing an array of items)
 */
export interface IStep {
  step: number;
  highlight: IHighlight;
  variables: Record<string, unknown>;
  stackTrace: string[];
  timestamp: number;
  view?: IView;
  extensions?: Record<string, IObject["items"]>;
}
