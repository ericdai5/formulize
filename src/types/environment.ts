import { IComputation } from "./computation";
import { IControls } from "./control";
import { IFormula } from "./formula";
import { IVariablesInput } from "./variable";
import { IVisualization } from "./visualization";

export interface IEnvironment {
  formulas: IFormula[];
  variables: IVariablesInput;
  computation: IComputation;
  visualizations?: IVisualization[];
  controls?: IControls[];
  fontSize?: number; // Font size multiplier (0.5 to 1.0) - will be formatted as "Xem"
  labelFontSize?: number; // Font size multiplier for labels (0.5 to 1.0) - will be formatted as "Xem"
  labelNodeStyle?: React.CSSProperties; // Custom CSS styles for label nodes
  formulaNodeStyle?: React.CSSProperties; // Custom CSS styles for formula nodes
}
