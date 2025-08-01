import { NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ArrayNode from "./array-node";
import ControlNode from "./control-node";
import FormulaNode from "./formula-node";
import LabelNode from "./label-node";
import SliderNode from "./slider-node";
import VariableNode from "./variable-node";
import ViewNode from "./view-node";
import VisualizationNode from "./visualization-node";

// Define custom node types
export const nodeTypes: NodeTypes = {
  formula: FormulaNode,
  controlPanel: ControlNode,
  variable: VariableNode,
  label: LabelNode,
  view: ViewNode,
  visualization: VisualizationNode,
  slider: SliderNode,
  array: ArrayNode,
};
