export const INPUT_VARIABLE_DEFAULT = {
  MIN_VALUE: -10 as number,
  MAX_VALUE: 10 as number,
  STEP_SIZE: 0.5 as number,
  VALUE: 0 as number,
};

export interface IVariable {
  type: "constant" | "input" | "dependent";
  value?: number;
  dataType?: "scalar" | "vector" | "matrix";
  dimensions?: number[];
  units?: string;
  name?: string;
  precision?: number;
  description?: string;
  range?: [number, number];
  step?: number;
  options?: string[];
  set?: (string | number)[];
  key?: string;
  memberOf?: string;
  latexDisplay?: "name" | "value" | "both";
  labelDisplay?: "name" | "value";
  index?: string;
}

export interface IVariableInput {
  value: number;
  minValue: number;
  maxValue: number;
  stepSize: number;
  symbol: string;
  varId: string;
}
