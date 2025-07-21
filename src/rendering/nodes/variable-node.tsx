import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { computationStore } from "../../api/computation";
import { useVariableDrag } from "../../rendering/useVariableDrag";

export interface VariableNodeData {
  varId: string;
  width?: number;
  height?: number;
}

const VariableNode = observer(({ data }: { data: VariableNodeData }) => {
  const { varId, width, height } = data;
  const variable = computationStore.variables.get(varId);
  const type = variable?.type === "input" ? "input" : "output";
  const hasDropdownOptions = !!(variable?.set || variable?.options);

  const nodeRef = useVariableDrag({
    varId,
    type,
    hasDropdownOptions,
  });

  return (
    <div
      ref={nodeRef}
      className="variable-flow-node text-xs text-white border-blue-500 border bg-blue-500/50 border-dashed rounded-lg px-3 py-2 text-center nodrag"
      style={{
        backgroundColor: "transparent",
        pointerEvents: "auto",
        width: width ? `${width}px` : "auto",
        height: height ? `${height}px` : "auto",
      }}
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
