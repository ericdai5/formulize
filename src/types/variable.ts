import type { VariableSVGContent } from "../rendering/svg/svg-registry";

export const INPUT_VARIABLE_DEFAULT = {
  MIN_VALUE: -10 as number,
  MAX_VALUE: 10 as number,
  STEP_SIZE: 0.5 as number,
  VALUE: 1 as number, // Default to 1 (safer than 0 for division/log operations)
};

export type IValue = number | (string | number)[];

/**
 * The role of a variable.
 * - "constant" variables are constants that are not computed.
 * - "input" variables are input variables that are user-defined.
 *    - Normal mode: input variables allow users to interact and control the value of the variable.
 *    - Step mode: input variables are non interactive.
 * - "computed" variables are computed variables that are computed by the engine.
 */
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
  latexDisplay?: "name" | "value";
  labelDisplay?: "name" | "value" | "svg" | "none";
  svgPath?: string;
  svgContent?: VariableSVGContent;
  svgSize?: { width: number; height: number };
  svgMode?: "replace" | "append";
  defaultCSS?: string;
  hoverCSS?: string;
  interaction?: "drag" | "inline"; // "drag" for slider-like drag, "inline" for typable input
}

/**
 * User-facing variable definition that uses "default" instead of "value"
 */
export type IVariableUserInput = Omit<IVariable, "value"> & {
  default?: IValue;
};

/**
 * Variable input format. Users can specify variables as:
 * - A number: `a: 0.1` (becomes a constant with that value)
 * - An IVariable object: `W: { role: "input" }` (role is required)
 */
export type IVariableInput = number | IVariable;

/**
 * User-facing variables config (for environment).
 * Uses "default" instead of "value" for better clarity in user-facing API.
 */
export type IVariablesUserInput = Record<string, number | IVariableUserInput>;

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
