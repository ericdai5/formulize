import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { useFormulize } from "../../components/useFormulize";
import { HANDLE_STYLE } from "../css-classes";

export interface ExpressionNodeData {
  width: number;
  height: number;
  varIds: string[];
}

/**
 * An invisible node that spans across multiple variable nodes.
 * Used to connect step nodes to a group of related variables.
 * When showExpressionNodes is enabled, displays a visible border for debugging.
 */
const ExpressionNode = observer(({ data }: { data: ExpressionNodeData }) => {
  const { width, height } = data;
  const context = useFormulize();
  const computationStore = context?.computationStore;
  const showBorder = computationStore?.showExpressionNodes ?? false;

  return (
    <div
      className="expression-flow-node"
      style={{
        width: width,
        height: height,
        position: "relative",
        // Show border when debug mode is enabled
        background: showBorder ? "rgba(59, 130, 246, 0.1)" : "transparent",
        // Always show top border with edge color (or dashed when debug mode)
        borderTop: showBorder ? "1px dashed #3b82f6" : "1px solid #cbd5e1",
        borderLeft: showBorder ? "1px dashed #3b82f6" : "none",
        borderRight: showBorder ? "1px dashed #3b82f6" : "none",
        borderBottom: showBorder ? "1px dashed #3b82f6" : "none",
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
