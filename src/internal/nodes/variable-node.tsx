import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { useStore } from "../../core/hooks";
import { debugStore } from "../../store/debug";
import { useVariableDrag } from "../../util/use-variable-drag";
import { HANDLE_STYLE, VAR_CLASSES } from "../css-classes";

export interface VariableNodeData {
  varId: string;
  width?: number;
  height?: number;
}

const VariableNode = observer(({ data }: { data: VariableNodeData }) => {
  const { varId, width, height } = data;
  const context = useStore();
  const computationStore = context?.computationStore;
  if (!computationStore) {
    return null;
  }

  // Use debugStore for persistent debug display settings
  const showBorders = debugStore.showVariableBorders;
  const showShadow = debugStore.showVariableShadow;
  const variable = computationStore.variables.get(varId);
  const isDraggable = variable?.input === "drag";
  const hasDropdownOptions = !!(
    Array.isArray(variable?.value) || variable?.options
  );
  const isSetVariable = variable?.dataType === "set";

  const nodeRef = useVariableDrag({
    varId,
    isDraggable: isSetVariable ? false : isDraggable, // Set variables are not draggable
    hasDropdownOptions: hasDropdownOptions || isSetVariable,
    computationStore: computationStore,
  });

  const handleMouseEnter = () => {
    computationStore.setVariableHover(varId, true);
  };

  const handleMouseLeave = () => {
    computationStore.setVariableHover(varId, false);
  };

  // Only show draggable cursor for draggable variables without dropdown and not set variables
  // Set variables get pointer cursor for click input
  const cursor = isSetVariable
    ? "pointer"
    : isDraggable && !hasDropdownOptions
      ? "ns-resize"
      : "default";

  return (
    <div
      ref={nodeRef}
      className={`${VAR_CLASSES.BASE} text-xs text-white border-dashed text-center nodrag ${
        showBorders ? "border border-blue-400" : ""
      } ${showShadow ? "bg-blue-400/20" : ""}`}
      style={{
        pointerEvents: "auto",
        width: width ? `${width}px` : "auto",
        height: height ? `${height}px` : "auto",
        cursor,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Handle for incoming edges from label nodes positioned above - hidden */}
      <Handle
        type="target"
        position={Position.Top}
        id="variable-handle-top"
        style={HANDLE_STYLE}
      />

      {/* Handle for incoming edges from label nodes positioned below - hidden */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="variable-handle-bottom"
        style={HANDLE_STYLE}
      />
    </div>
  );
});

export default VariableNode;
