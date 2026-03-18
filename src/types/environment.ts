import { ISemantics } from "./computation";
import { IControls } from "./control";
import { IFormula } from "./formula";
import { IGraph2D } from "./graph2d";
import { IGraph3D } from "./graph3d";
import { IVariablesUserInput } from "./variable";

export interface IEnvironment {
  formulas: IFormula[];
  variables?: IVariablesUserInput;
  semantics?: ISemantics;
  graph2d?: IGraph2D[];
  graph3d?: IGraph3D[];
  controls?: IControls[];
  stepping?: boolean; // Enable step mode for step-through debugging of semantics function
  fontSize?: number; // Font size multiplier (0.5 to 3.0) - will be formatted as "Xem" (default: 2)
  labelFontSize?: number; // Font size multiplier for labels (0.5 to 3.0) - will be formatted as "Xem"
  labelNodeStyle?: React.CSSProperties; // Custom CSS styles for label nodes
  formulaNodeStyle?: React.CSSProperties; // Custom CSS styles for formula nodes
}
