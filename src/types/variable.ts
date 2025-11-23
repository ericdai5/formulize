export const INPUT_VARIABLE_DEFAULT = {
  MIN_VALUE: -10 as number,
  MAX_VALUE: 10 as number,
  STEP_SIZE: 0.5 as number,
  VALUE: 0 as number,
};

export type IValue = number | (string | number)[];

export interface IVariable {
  role: "constant" | "input" | "dependent";
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
}

export interface IVariableInput {
  value: number;
  minValue: number;
  maxValue: number;
  stepSize: number;
  symbol: string;
  varId: string;
}
