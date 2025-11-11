import { IValue } from "./variable";

export interface IFormula {
  formulaId: string; // Unique identifier for this formula
  latex: string;
  expression?: string; // Optional computational expression for this formula
  manual?: (vars: Record<string, IValue>) => IValue | void; // Optional manual computation function - vars contains values (numbers or arrays)
  variableLinkage?: Record<string, string>; // Maps local variable names to computationStore variable names
}
