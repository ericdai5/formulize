import React from "react";

import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { useStore } from "../../core/hooks";
import { debugStore } from "../../store/debug";
import { showInlineEditOverlay } from "../../util/inline-edit-overlay";
import { useVariableDrag } from "../../util/use-variable-drag";
import { getVariableElement } from "../../util/variable-occurrence";
import { HANDLE_STYLE, VAR_CLASSES } from "../css-classes";

export interface VariableNodeData {
  varId: string;
  instance: number;
  formulaNodeId?: string;
  width?: number;
  height?: number;
}

const VariableNode = observer(({ data }: { data: VariableNodeData }) => {
  const { varId, instance, formulaNodeId, width, height } = data;
  const context = useStore();
  const computationStore = context?.computationStore;

  // Use debugStore for persistent debug display settings
  const showBorders = debugStore.showVariableBorders;
  const showShadow = debugStore.showVariableShadow;
  const variable = computationStore?.variables.get(varId);
  const isDraggable = variable?.input === "drag";
  const isInlineEditable = variable?.input === "inline";
  const hasDropdownOptions = !!(
    Array.isArray(variable?.value) || variable?.options
  );
  const isSetVariable = variable?.dataType === "set";

  // Only enable inline editing on this node if latexDisplay is "value"
  // When latexDisplay is "name" (default), the label handles inline editing instead
  const latexDisplay = variable?.latexDisplay ?? "name";

  // All hooks must be called before any conditional returns
  const nodeRef = useVariableDrag({
    varId,
    isDraggable: isSetVariable ? false : isDraggable, // Set variables are not draggable
    hasDropdownOptions: hasDropdownOptions || isSetVariable,
    computationStore: computationStore ?? null,
  });

  // Early return after all hooks have been called
  if (!computationStore) {
    return null;
  }

  const handleMouseEnter = () => {
    computationStore.setVariableHover(varId, true);
  };

  const handleMouseLeave = () => {
    computationStore.setVariableHover(varId, false);
  };

  // Prevent mousedown from causing blur on the input when already editing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isInlineEditable || latexDisplay !== "value") return;

    // If already editing this variable, prevent mousedown from stealing focus
    if (computationStore.editingStates.get(varId)) {
      e.preventDefault();
    }
  };

  // Handle click for inline editable variables
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInlineEditable || latexDisplay !== "value") return;
    if (computationStore.editingStates.get(varId)) return;

    // Find the formula container that owns this variable node
    // Then query within that container to find the correct MathJax element
    const reactFlowContainer = (e.currentTarget as HTMLElement).closest(
      ".react-flow"
    );
    const formulaElement = formulaNodeId
      ? reactFlowContainer?.querySelector(
          `[data-id="${CSS.escape(formulaNodeId)}"] .formula-node`
        )
      : null;
    const searchRoot = formulaElement ?? reactFlowContainer;
    const mathJaxElement = searchRoot
      ? getVariableElement(searchRoot, varId, instance)
      : null;
    if (mathJaxElement) {
      showInlineEditOverlay({
        varId,
        element: mathJaxElement,
        computationStore,
      });
    }
  };

  // Check if we're currently editing this variable
  const isEditing = computationStore.editingStates.get(varId);

  // Determine cursor based on variable type and inline edit capability
  const cursor =
    isInlineEditable && latexDisplay === "value"
      ? "text"
      : isSetVariable
        ? "pointer"
        : isDraggable && !hasDropdownOptions
          ? "ns-resize"
          : "default";

  return (
    <div
      ref={nodeRef}
      className={`${VAR_CLASSES.ALL} ${VAR_CLASSES.BASE} text-xs text-white border-dashed text-center nodrag ${
        showBorders ? "border border-blue-400" : ""
      } ${showShadow ? "bg-blue-400/20" : ""}`}
      style={{
        // When editing, disable pointer events so clicks pass through to the input underneath
        pointerEvents: isEditing ? "none" : "auto",
        width: width ? `${width}px` : "auto",
        height: height ? `${height}px` : "auto",
        cursor,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
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
