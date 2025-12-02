/**
 * Manual computation function type.
 * Receives all variable values and can return computed values.
 */
export type IManual = (vars: Record<string, any>) => any;

export interface ISemantics {
  engine: "symbolic-algebra" | "llm" | "manual";
  expressions?: Record<string, string>;
  manual?: IManual;
  variableLinkage?: Record<string, string>;
  mappings?: Record<string, (...args: unknown[]) => unknown>;
  apiKey?: string;
  model?: string;
  mode?: "step" | "normal";
}
