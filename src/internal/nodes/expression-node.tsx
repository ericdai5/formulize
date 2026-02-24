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
 * Used to connect expression labels to expression scopes.
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
        // Active expression scope is shown as a translucent blue overlay.
        background: showShadow
          ? "rgba(96, 165, 250, 0.24)"
          : "rgba(96, 165, 250, 0.14)",
        // Border is only for explicit debug mode.
        borderTop: showBorder ? "1px dashed #60a5fa" : "none",
        borderLeft: showBorder ? "1px dashed #60a5fa" : "none",
        borderRight: showBorder ? "1px dashed #60a5fa" : "none",
        borderBottom: showBorder ? "1px dashed #60a5fa" : "none",
        borderRadius: 4,
        pointerEvents: "none",
      }}
    >
      {/* Handles on all sides so edges can attach from any direction */}
      <Handle
        type="target"
        position={Position.Top}
        id="expression-handle-top"
        style={{ ...HANDLE_STYLE, transform: "translateX(-50%)" }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="expression-handle-bottom"
        style={{ ...HANDLE_STYLE, transform: "translateX(-50%)" }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="expression-handle-left"
        style={{ ...HANDLE_STYLE, transform: "translateY(-50%)" }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="expression-handle-right"
        style={{ ...HANDLE_STYLE, transform: "translateY(-50%)" }}
      />
    </div>
  );
});

export default ExpressionNode;
