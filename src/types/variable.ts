import type { VariableSVGContent } from "../util/svg/svg-registry";

export const INPUT_VARIABLE_DEFAULT = {
  MIN_VALUE: -10 as number,
  MAX_VALUE: 10 as number,
  STEP_SIZE: 0.5 as number,
  VALUE: 1 as number, // Default to 1 (safer than 0 for division/log operations)
  PRECISION: 2 as number, // Default precision (decimal places)
};

export type IValue = number | (string | number)[];

/**
 * The input type for a variable.
 * - "drag" variables allow users to drag/slide to change the value.
 * - "inline" variables display an editable text input for direct value entry.
 * Variables without input are either constants or computed by the manual function.
 */
export type IInput = "drag" | "inline";

export interface IOccurence {
  formula: string[];
  instance: number[];
}

export interface IVariable {
  value?: IValue;
  dataType?: "scalar" | "vector" | "matrix" | "set";
  dimensions?: number[];
  units?: string;
  name?: string;
  precision?: number;
  sigFigs?: number;
  description?: string;
  range?: [number, number];
  step?: number;
  options?: string[];
  key?: string;
  latexDisplay?: "name" | "value" | "svg";
  labelDisplay?: "name" | "value" | "svg" | "none";
  svgPath?: string;
  svgContent?: VariableSVGContent;
  svgSize?: { width: number; height: number };
  svgMode?: "replace" | "append";
  defaultCSS?: string;
  hoverCSS?: string;
  input?: IInput;
  filter?: IOccurence[];
  exclude?: IOccurence[];
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
 * - An IVariable object: `W: { input: "drag" }` (for interactive variables)
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

export const getStepFromRange = (
  range?: [number, number]
): number | undefined => {
  if (!range) {
    return undefined;
  }

  const [minValue, maxValue] = range;
  const step = Math.abs(maxValue - minValue) / 100;
  return step > 0 ? step : undefined;
};
