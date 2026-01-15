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
 * @property description - The description text to display
 * @property expression - Optional expression scope for bounding box around
 * expression and also active variables
 * @property formulaId - Optional formula ID to target specific formula component
 */
export interface IView {
  description: string;
  expression?: string;
  formulaId?: string;
}

/**
 * A step in the execution of the code
 * @property step - The step number
 * @property highlight - The highlight of the code
 * @property variables - The variables in the step
 * @property stackTrace - The stack trace of the step
 * @property timestamp - The timestamp of the step
 * @property view - The view of the step
 */
export interface IStep {
  step: number;
  highlight: IHighlight;
  variables: Record<string, unknown>;
  stackTrace: string[];
  timestamp: number;
  view?: IView;
}
