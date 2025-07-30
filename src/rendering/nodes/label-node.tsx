import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import LatexLabel from "../../components/latex";
import { computationStore } from "../../store/computation";
import { executionStore } from "../../store/execution";

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

  // Get view description if available
  const viewDescription = executionStore.currentViewDescriptions[varId];

  // Determine if handle is above or below (you may need to adjust this logic based on actual handle usage)
  // For now, assuming default is handle above, but this could be determined from props or edge connections
  const isHandleAbove = true; // This should be determined by actual handle usage

  const mainContent = (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-2">
      <div className="flex flex-col items-center gap-1">
        <LatexLabel latex={displayLatex} />
        {label && (
          <div className="text-xs text-slate-500 text-center">{label}</div>
        )}
      </div>
    </div>
  );

  const viewDescriptionContent = viewDescription && (
    <div className="text-xs text-blue-600 font-regular text-center bg-white border border-blue-200 rounded-lg px-2 py-1">
      {viewDescription}
    </div>
  );

  return (
    <div
      className="label-flow-node text-base text-slate-700 hover:scale-105 transition-all duration-100"
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
        {isHandleAbove ? (
          <>
            {mainContent}
            {viewDescriptionContent}
          </>
        ) : (
          <>
            {viewDescriptionContent}
            {mainContent}
          </>
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
