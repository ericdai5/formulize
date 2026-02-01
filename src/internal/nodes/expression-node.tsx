import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { debugStore } from "../../store/debug";
import { HANDLE_STYLE } from "../css-classes";

export interface ExpressionNodeData {
  width: number;
  height: number;
  varIds: string[];
}

/**
 * An invisible node that spans across multiple variable nodes.
 * Used to connect step nodes to a group of related variables.
 * When showExpressionBorders/showExpressionShadow is enabled, displays visible debugging aids.
 */
const ExpressionNode = observer(({ data }: { data: ExpressionNodeData }) => {
  const { width, height } = data;
  // Use debugStore for persistent debug display settings
  const showBorder = debugStore.showExpressionBorders;
  const showShadow = debugStore.showExpressionShadow;

  return (
    <div
      className="expression-flow-node"
      style={{
        width: width,
        height: height,
        position: "relative",
        // Show background when shadow mode is enabled
        background: showShadow ? "rgba(96, 165, 250, 0.2)" : "transparent",
        // Always show top border with edge color (or dashed when border mode)
        borderTop: showBorder ? "1px dashed #60a5fa" : "1px solid #cbd5e1",
        borderLeft: showBorder ? "1px dashed #60a5fa" : "none",
        borderRight: showBorder ? "1px dashed #60a5fa" : "none",
        borderBottom: showBorder ? "1px dashed #60a5fa" : "none",
        borderRadius: 4,
        pointerEvents: "none",
      }}
    >
      {/* Handle at the top center for connecting edges from step nodes */}
      <Handle
        type="target"
        position={Position.Top}
        id="expression-handle-top"
        style={{ ...HANDLE_STYLE, transform: "translateX(-50%)" }}
      />
    </div>
  );
});

export default ExpressionNode;
