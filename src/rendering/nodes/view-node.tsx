import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import LatexLabel from "../../components/latex";
import { HANDLE_STYLE } from "../css-classes";

export interface ViewNodeData {
  expression: string;
  description: string;
  activeVarIds?: string[];
}

const ViewNode = observer(({ data }: { data: ViewNodeData }) => {
  const { expression, description } = data;

  // Wrap text in \text{} for proper LaTeX text rendering
  const latexDescription = `\\text{${description}}`;

  return (
    <div
      className="view-flow-node text-base text-black font-regular text-center rounded-xl"
      style={{
        pointerEvents: "auto",
        width: "auto",
        height: "auto",
        position: "relative",
        cursor: "grab",
      }}
      title={`View comment for expression: ${expression} (draggable)`}
    >
      {/* Handle at the center bottom for connecting edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="view-handle-bottom"
        style={HANDLE_STYLE}
      />
      <LatexLabel latex={latexDescription} />
    </div>
  );
});

export default ViewNode;
