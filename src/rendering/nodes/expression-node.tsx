import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { computationStore } from "../../store/computation";
import { HANDLE_STYLE } from "../css-classes";

export interface ExpressionNodeData {
  width: number;
  height: number;
  varIds: string[];
}

/**
 * An invisible node that spans across multiple variable nodes.
 * Used to connect view nodes to a group of related variables.
 * When showExpressionNodes is enabled, displays a visible border for debugging.
 */
const ExpressionNode = observer(({ data }: { data: ExpressionNodeData }) => {
  const { width, height } = data;
  const showBorder = computationStore.showExpressionNodes;

  return (
    <div
      className="expression-flow-node"
      style={{
        width: width,
        height: height,
        position: "relative",
        // Show border when debug mode is enabled
        background: showBorder ? "rgba(59, 130, 246, 0.1)" : "transparent",
        border: showBorder ? "1px dashed #3b82f6" : "none",
        borderRadius: showBorder ? 4 : 0,
        pointerEvents: "none",
      }}
    >
      {/* Handle at the bottom center for connecting edges from view nodes */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="expression-handle-bottom"
        style={HANDLE_STYLE}
      />
    </div>
  );
});

export default ExpressionNode;
