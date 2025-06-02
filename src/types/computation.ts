export interface IComputation {
  engine: "symbolic-algebra" | "llm" | "manual";
  formula?: string;
  mappings?: Record<string, (...args: unknown[]) => unknown>;
  apiKey?: string;
  model?: string;
}
