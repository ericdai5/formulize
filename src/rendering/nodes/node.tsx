import { NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ControlNode from "./control-node";
import ExpressionNode from "./expression-node";
import FormulaNode from "./formula-node";
import InterpreterControlNode from "./interpreter-control-node";
import LabelNode from "./label-node";
import VariableNode from "./variable-node";
import stepNode from "./view-node";
import VisualizationNode from "./visualization-node";

// Define custom node types
export const nodeTypes: NodeTypes = {
  formula: FormulaNode,
  control: ControlNode,
  controlPanel: ControlNode, // Legacy support
  interpreterControl: InterpreterControlNode,
  variable: VariableNode,
  label: LabelNode,
  view: stepNode,
  expression: ExpressionNode,
  visualization: VisualizationNode,
};
