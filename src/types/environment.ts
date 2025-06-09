import { IComputation } from "./computation";
import { IFormula } from "./formula";
import { IVariable } from "./variable";
import { IVisualization } from "./visualization";

export interface IEnvironment {
  formulas: IFormula[];
  variables: Record<string, IVariable>;
  computation: IComputation;
  visualizations?: IVisualization[];
}
