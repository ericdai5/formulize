export interface IComputation {
  engine: "symbolic-algebra" | "llm" | "manual";
  mappings?: Record<string, (...args: unknown[]) => unknown>;
  apiKey?: string;
  model?: string;
  mode?: "step" | "normal";
  setFunctions?: Record<string, ((variables: Record<string, any>) => string[])>;
}
