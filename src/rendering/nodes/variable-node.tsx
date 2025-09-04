import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { useVariableDrag } from "../../rendering/useVariableDrag";
import { computationStore } from "../../store/computation";

export interface VariableNodeData {
  varId: string;
  width?: number;
  height?: number;
  showBorders?: boolean;
}

const VariableNode = observer(({ data }: { data: VariableNodeData }) => {
  const { varId, width, height, showBorders = false } = data;
  const variable = computationStore.variables.get(varId);
  const type = variable?.type === "input" ? "input" : "output";
  const hasDropdownOptions = !!(variable?.set || variable?.options);

  const nodeRef = useVariableDrag({
    varId,
    type,
    hasDropdownOptions,
  });

  const handleMouseEnter = () => {
    computationStore.setVariableHover(varId, true);
  };

  const handleMouseLeave = () => {
    computationStore.setVariableHover(varId, false);
  };

  return (
    <div
      ref={nodeRef}
      className={`interactive-var-base text-xs text-white border-dashed text-center nodrag ${
        showBorders ? "border border-blue-500 bg-blue-500/50" : ""
      }`}
      style={{
        backgroundColor: "transparent",
        pointerEvents: "auto",
        width: width ? `${width}px` : "auto",
        height: height ? `${height}px` : "auto",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Handle for incoming edges from label nodes positioned above - hidden */}
      <Handle
        type="target"
        position={Position.Top}
        id="variable-handle-top"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />

      {/* Handle for incoming edges from label nodes positioned below - hidden */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="variable-handle-bottom"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />
    </div>
  );
});

export default VariableNode;
