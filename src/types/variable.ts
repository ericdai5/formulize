export const INPUT_VARIABLE_DEFAULT = {
  MIN_VALUE: -10 as number,
  MAX_VALUE: 10 as number,
  STEP_SIZE: 0.5 as number,
  VALUE: 1 as number, // Default to 1 (safer than 0 for division/log operations)
};

export type IValue = number | (string | number)[];

export type IRole = "constant" | "input" | "computed";

export interface IVariable {
  role: IRole;
  value?: IValue;
  dataType?: "scalar" | "vector" | "matrix" | "set";
  dimensions?: number[];
  units?: string;
  name?: string;
  precision?: number;
  description?: string;
  range?: [number, number];
  step?: number;
  options?: string[];
  key?: string;
  memberOf?: string;
  latexDisplay?: "name" | "value";
  labelDisplay?: "name" | "value" | "svg" | "none";
  index?: string;
  svgPath?: string;
  svgContent?: string;
  svgSize?: { width: number; height: number };
  svgMode?: "replace" | "append";
  defaultCSS?: string;
  hoverCSS?: string;
  interaction?: "drag" | "inline"; // "drag" for slider-like drag, "inline" for typable input
}

/**
 * Variable input format. Users can specify variables as:
 * - A number: `a: 0.1` (becomes a constant with that value)
 * - An IVariable object: `W: { role: "input" }` (role is required)
 */
export type IVariableInput = number | IVariable;

/**
 * User-facing variables config.
 */
export type IVariablesInput = Record<string, IVariableInput>;

/**
 * Internal type for variable drag handler state
 */
export interface IVariableDragState {
  value: number;
  minValue: number;
  maxValue: number;
  stepSize: number;
  symbol: string;
  varId: string;
}
