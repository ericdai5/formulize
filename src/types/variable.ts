export interface IVariableBind {
  source?: {
    component: string;
    property: string;
  };
  direction?: "bidirectional" | "to-target";
  transform?: (value: any) => any;
  reverseTransform?: (value: any) => any;
  condition?: (context: any) => boolean;
}

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
  bind?: IVariableBind;
}
