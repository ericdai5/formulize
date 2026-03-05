import { NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ControlNode from "./control-node";
import EmptyNode from "./empty-node";
import ExpressionNode from "./expression-node";
import FormulaNode from "./formula-node";
import GraphNode from "./graph-node";
import LabelNode from "./label-node";
import { StepControlNode } from "./node-wrapper";
import StepNode from "./step-node";
import VariableNode from "./variable-node";

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
  graph: GraphNode,
  emptyNode: EmptyNode,
};
