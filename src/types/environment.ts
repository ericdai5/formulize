import { IComputation } from "./computation";
import { IControls } from "./control";
import { IFormula } from "./formula";
import { IVariable } from "./variable";
import { IVisualization } from "./visualization";

export interface IEnvironment {
  formulas: IFormula[];
  variables: Record<string, IVariable>;
  computation: IComputation;
  visualizations?: IVisualization[];
  controls?: IControls[];
  fontSize?: number; // Font size multiplier (0.5 to 1.0) - will be formatted as "Xem"
}
