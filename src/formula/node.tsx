import { NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ControlNode from "./control-node";
import FormulaNode from "./formula-node";

// Define custom node types
export const nodeTypes: NodeTypes = {
  formula: FormulaNode,
  controlPanel: ControlNode,
};
