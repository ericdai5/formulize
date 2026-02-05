import { NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ControlNode from "./control-node";
import ExpressionNode from "./expression-node";
import FormulaNode from "./formula-node";
import LabelNode from "./label-node";
import { StepControlNode } from "./node-wrapper";
import StepNode from "./step-node";
import VariableNode from "./variable-node";
import VisualizationNode from "./visualization-node";

// Define custom node types
export const nodeTypes: NodeTypes = {
  formula: FormulaNode,
  control: ControlNode,
  controlPanel: ControlNode, // Legacy support
  interpreterControl: StepControlNode,
  variable: VariableNode,
  label: LabelNode,
  step: StepNode,
  expression: ExpressionNode,
  visualization: VisualizationNode,
};
