import { IVariable } from "./variable";

export interface IFormula {
  name: string;
  function: string;
  expression?: string; // Optional computational expression for this formula
  manual?: (variables: Record<string, IVariable>) => number; // Optional manual computation function
  variableLinkage?: Record<string, string>; // Maps local variable names to computationStore variable names
}
