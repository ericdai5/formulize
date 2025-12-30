import { ISemantics } from "./computation";
import { IControls } from "./control";
import { IFormula } from "./formula";
import { IVariablesUserInput } from "./variable";
import { IVisualization } from "./visualization";

export interface IEnvironment {
  formulas: IFormula[];
  variables: IVariablesUserInput;
  semantics: ISemantics;
  visualizations?: IVisualization[];
  controls?: IControls[];
  fontSize?: number; // Font size multiplier (0.5 to 3.0) - will be formatted as "Xem" (default: 2)
  labelFontSize?: number; // Font size multiplier for labels (0.5 to 3.0) - will be formatted as "Xem"
  labelNodeStyle?: React.CSSProperties; // Custom CSS styles for label nodes
  formulaNodeStyle?: React.CSSProperties; // Custom CSS styles for formula nodes
}
