export interface IVariable {
  type: "constant" | "input" | "dependent";
  value?: number;
  dataType?: "scalar" | "vector" | "matrix";
  dimensions?: number[];
  units?: string;
  label?: string;
  precision?: number;
  description?: string;
  range?: [number, number];
  step?: number;
  options?: string[];
}
