import { NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ControlNode from "./control-node";
import FormulaNode from "./formula-node";
import LabelNode from "./label-node";
import VariableNode from "./variable-node";
import VisualizationNode from "./visualization-node";

// Define custom node types
export const nodeTypes: NodeTypes = {
  formula: FormulaNode,
  controlPanel: ControlNode,
  variable: VariableNode,
  label: LabelNode,
  visualization: VisualizationNode,
};
