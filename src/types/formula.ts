export interface IFormula {
  name: string;
  function: string;
  expression?: string; // Optional computational expression for this formula
  manual?: (variables: Record<string, number>) => number; // Optional manual computation function
}
