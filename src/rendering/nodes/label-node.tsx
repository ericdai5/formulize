import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import LatexLabel from "../../components/latex";
import { useVariableDrag } from "../../rendering/useVariableDrag";
import { computationStore } from "../../store/computation";
import { executionStore } from "../../store/execution";

export interface LabelNodeData {
  varId: string;
}

const LabelNode = observer(({ data }: { data: LabelNodeData }) => {
  const { varId } = data;

  const variable = computationStore.variables.get(varId);
  const isVariableActive = executionStore.activeVariables.has(varId);
  const isHovered = computationStore.hoverStates.get(varId) ?? false;

  const valueDragRef = useVariableDrag({
    varId,
    type: variable?.type === "input" ? "input" : "output",
    hasDropdownOptions: !!(variable?.set || variable?.options),
  });

  // All conditional returns must happen after all hooks are called
  if (!variable) return null;
  if (computationStore.isStepMode() && !isVariableActive) return null;

  const { name, type, set, value, precision, labelDisplay, index } = variable;

  // Get index variable information
  const indexVariable = index;
  let indexDisplay = "";

  if (indexVariable) {
    const indexVar = computationStore.variables.get(indexVariable);
    if (indexVar && indexVar.value !== undefined && !isNaN(indexVar.value)) {
      // Format precision based on the index variable's precision or default to 0 for integers
      const precision = indexVar.precision ?? 0;
      indexDisplay = `${indexVariable} = ${indexVar.value.toFixed(precision)}`;
    }
  }

  // Determine what to display based on labelDisplay setting
  let mainDisplayText = varId;
  if (labelDisplay === "value") {
    if (value !== undefined && value !== null) {
      const displayPrecision = precision ?? (Number.isInteger(value) ? 0 : 2);
      mainDisplayText = value.toFixed(displayPrecision);
    } else {
      // If labelDisplay is "value" but no value is set, hide the label node
      return null;
    }
  }

  // Combine main display text and index display inline
  const displayLatex = indexDisplay
    ? `${mainDisplayText}, ${indexDisplay}`
    : mainDisplayText;

  // Determine interactive variable styling based on variable type and context
  const getInteractiveClass = () => {
    if (computationStore.isStepMode()) {
      return "step-cue"; // Step mode styling
    }

    if (type === "dependent") {
      return "interactive-var-dependent";
    }

    if (type === "input") {
      if (set && set.length > 0) {
        return "interactive-var-dropdown";
      } else {
        return "interactive-var-slidable";
      }
    }

    return "interactive-var-base";
  };

  const interactiveClass = getInteractiveClass();

  return (
    <div
      className="label-flow-node text-base text-slate-700"
      style={{
        pointerEvents: "auto",
        width: "auto",
        height: "auto",
        position: "relative",
        cursor: "grab",
      }}
      title={`Variable: ${varId}${name ? ` (${name})` : ""}${indexDisplay ? ` [${indexDisplay}]` : ""} (draggable)`}
      onMouseEnter={() => computationStore.setVariableHover(varId, true)}
      onMouseLeave={() => computationStore.setVariableHover(varId, false)}
    >
      <div className={`bg-white rounded-xl p-3 border border-slate-200}`}>
        <div className="flex flex-col items-center gap-1">
          <div
            ref={valueDragRef}
            className={`${interactiveClass} ${isHovered ? "interactive-var-hovered" : ""}`}
            style={{ cursor: "ns-resize" }}
          >
            <LatexLabel latex={displayLatex} />
          </div>
          {name && (
            <div className="text-xs text-slate-500 text-center">{name}</div>
          )}
        </div>
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
