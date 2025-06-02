import { IComputation } from "./computation";
import { IVariable } from "./variable";

export interface IFormula {
  expression: string;
  id?: string;
  description?: string;
  displayMode?: "block" | "inline";
  variables: Record<string, IVariable>;
  computation?: IComputation;
}
