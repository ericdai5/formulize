import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { computationStore } from "../../api/computation";

export interface LabelNodeData {
  varId: string;
}

const LabelNode = observer(({ data }: { data: LabelNodeData }) => {
  const { varId } = data;
  const variable = computationStore.variables.get(varId);
  const label = variable?.label;

  if (!label) {
    return null;
  }

  return (
    <div
      className="label-flow-node text-base text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:shadow-sky-100 hover:shadow-md hover:scale-105 transition-all duration-100"
      style={{
        pointerEvents: "auto",
        width: "auto",
        height: "auto",
        position: "relative",
        cursor: "grab",
      }}
      title={`Variable: ${varId} (draggable)`}
    >
      {label}
      {/* Handle for edges to variable nodes positioned above - hidden */}
      <Handle
        type="source"
        position={Position.Top}
        id="label-handle-above"
        style={{
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />
      {/* Handle for edges to variable nodes positioned below - hidden */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="label-handle-below"
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

export default LabelNode;
