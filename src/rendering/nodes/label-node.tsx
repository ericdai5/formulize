import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { computationStore } from "../../api/computation";
import LatexLabel from "../../components/latex";

export interface LabelNodeData {
  varId: string;
}

const LabelNode = observer(({ data }: { data: LabelNodeData }) => {
  const { varId } = data;
  const variable = computationStore.variables.get(varId);
  const label = variable?.label;

  // Get index variable information
  const indexVariable = variable?.index;
  let indexDisplay = "";

  if (indexVariable) {
    const indexVar = computationStore.variables.get(indexVariable);
    if (indexVar && indexVar.value !== undefined && !isNaN(indexVar.value)) {
      // Format precision based on the index variable's precision or default to 0 for integers
      const precision = indexVar.precision ?? 0;
      indexDisplay = `${indexVariable} = ${indexVar.value.toFixed(precision)}`;
    }
  }

  // Combine variable name and index display inline
  const displayLatex = indexDisplay ? `${varId}, ${indexDisplay}` : varId;

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
      title={`Variable: ${varId}${label ? ` (${label})` : ""}${indexDisplay ? ` [${indexDisplay}]` : ""} (draggable)`}
    >
      <div className="flex flex-col items-center gap-1">
        <LatexLabel latex={displayLatex} />
        {label && (
          <div className="text-xs text-slate-500 text-center">{label}</div>
        )}
      </div>
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
