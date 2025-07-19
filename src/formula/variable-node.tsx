import { observer } from "mobx-react-lite";

import { computationStore } from "../api/computation";
import { useVariableDrag } from "./useVariableDrag";

export interface VariableNodeData {
  varId: string;
  width?: number;
  height?: number;
}

const VariableNode = observer(({ data }: { data: VariableNodeData }) => {
  const { varId, width, height } = data;
  const variable = computationStore.variables.get(varId);
  const value = variable?.value ?? 0;
  const type = variable?.type === "input" ? "input" : "output";
  const hasDropdownOptions = !!(variable?.set || variable?.options);

  const nodeRef = useVariableDrag({
    varId,
    value,
    type,
    hasDropdownOptions,
  });

  return (
    <div
      ref={nodeRef}
      className="variable-flow-node text-xs text-white border-blue-500 border-2 bg-blue-500/50 border-dashed rounded-lg px-3 py-2 text-center nodrag"
      style={{
        backgroundColor: "transparent",
        pointerEvents: "auto",
        width: width ? `${width}px` : "auto",
        height: height ? `${height}px` : "auto",
      }}
    />
  );
});

export default VariableNode;
