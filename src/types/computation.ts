export interface IComputation {
  engine: "symbolic-algebra" | "llm" | "manual";
  expressions: string[];
  mappings?: Record<string, (...args: unknown[]) => unknown>;
  apiKey?: string;
  model?: string;
}
