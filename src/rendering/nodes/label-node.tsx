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
  const name = variable?.name;
  const type = variable?.type === "input" ? "input" : "output";
  const hasDropdownOptions = !!(variable?.set || variable?.options);

  const valueDragRef = useVariableDrag({
    varId,
    type,
    hasDropdownOptions,
  });

  // Only show labels for variables that have been changed during manual execution
  const isVariableActive = executionStore.activeVariables.has(varId);

  // If in step mode and variable is not active, hide the label
  if (computationStore.isStepMode() && !isVariableActive) {
    return null;
  }

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

  // Determine what to display based on labelDisplay setting
  let mainDisplayText = varId; // default to name
  if (variable?.labelDisplay === "value") {
    if (variable?.value !== undefined && variable?.value !== null) {
      const precision =
        variable.precision ?? (Number.isInteger(variable.value) ? 0 : 2);
      mainDisplayText = variable.value.toFixed(precision);
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

    if (variable?.type === "dependent") {
      return "interactive-var-dependent";
    }

    if (variable?.type === "input") {
      if (variable?.set && variable.set.length > 0) {
        return "interactive-var-dropdown";
      } else {
        return "interactive-var-slidable";
      }
    }

    return "interactive-var-base";
  };

  const interactiveClass = getInteractiveClass();

  // Add hover class if variable is being hovered
  const finalInteractiveClass = variable?.hover
    ? `${interactiveClass} interactive-var-hovered`
    : interactiveClass;

  const handleMouseEnter = () => {
    computationStore.setVariableHover(varId, true);
  };

  const handleMouseLeave = () => {
    computationStore.setVariableHover(varId, false);
  };

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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`bg-white rounded-xl p-3 border border-slate-200}`}>
        <div className="flex flex-col items-center gap-1">
          <div
            ref={valueDragRef}
            className={`${finalInteractiveClass}`}
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
