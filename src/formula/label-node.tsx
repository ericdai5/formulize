import { observer } from "mobx-react-lite";

import { computationStore } from "../api/computation";

export interface LabelNodeData {
  varId: string;
  placement?: "below" | "above";
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
      className="label-flow-node text-base text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm"
      style={{
        pointerEvents: "none",
        width: "auto",
        height: "auto",
        position: "relative",
      }}
      title={`Variable: ${varId}`}
    >
      {label}
    </div>
  );
});

export default LabelNode;
