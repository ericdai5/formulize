/**
 * Manual computation function type.
 * Receives all variable values and can return computed values.
 */
export type IManual = (vars: Record<string, any>) => any;

export interface ISemantics {
  expressions?: Record<string, string>;
  manual?: IManual;
  mode?: "step" | "normal";
}
