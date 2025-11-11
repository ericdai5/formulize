export interface IFormula {
  formulaId: string; // Unique identifier for this formula
  latex: string;
  expression?: string; // Optional computational expression for this formula
  manual?: (vars: Record<string, unknown>) => number | unknown[] | void; // Optional manual computation function - vars contains values or sets, can return number, array, or void
  variableLinkage?: Record<string, string>; // Maps local variable names to computationStore variable names
}
