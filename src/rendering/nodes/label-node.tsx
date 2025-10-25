import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import LatexLabel from "../../components/latex";
import SVGLabel from "../../components/svg-label";
import { useVariableDrag } from "../../rendering/useVariableDrag";
import { computationStore } from "../../store/computation";
import { executionStore } from "../../store/execution";

export interface LabelNodeData {
  varId: string;
}

// Static styles to prevent re-renders
// In React, when you pass an inline object (like style={{...}}), a new object
// reference is created each time, causing React to think the props changed and
// triggering a re-render.
const HANDLE_STYLE = {
  opacity: 0,
  pointerEvents: "none" as const,
  width: 1,
  height: 1,
};

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
  let mainDisplayText = varId; // default to name
  let displayComponent: React.ReactNode = null;

  if (labelDisplay === "value") {
    if (value !== undefined && value !== null) {
      const displayPrecision = precision ?? (Number.isInteger(value) ? 0 : 2);
      mainDisplayText = value.toFixed(displayPrecision);
      displayComponent = <LatexLabel latex={mainDisplayText} />;
    } else {
      // If labelDisplay is "value" but no value is set, hide the label node
      return null;
    }
  } else if (labelDisplay === "svg") {
    // Render SVG instead of LaTeX
    displayComponent = (
      <SVGLabel
        svgPath={variable?.svgPath}
        svgContent={variable?.svgContent}
        svgSize={variable?.svgSize}
      />
    );
  } else {
    // Default to name display
    const displayLatex = indexDisplay
      ? `${mainDisplayText}, ${indexDisplay}`
      : mainDisplayText;
    displayComponent = <LatexLabel latex={displayLatex} />;
  }

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
  const isDraggable = type === "input" || type === "dependent";
  const cursor = isDraggable ? "grab" : "default";
  const valueCursor =
    type === "input" && !computationStore.isStepMode()
      ? "ns-resize"
      : "default";

  return (
    <div
      className="label-flow-node text-base text-slate-700"
      style={{
        pointerEvents: "auto",
        width: "auto",
        height: "auto",
        position: "relative",
        cursor,
      }}
      title={`Variable: ${varId}${name ? ` (${name})` : ""}${indexDisplay ? ` [${indexDisplay}]` : ""}${isDraggable ? " (draggable)" : ""}`}
      onMouseEnter={() => computationStore.setVariableHover(varId, true)}
      onMouseLeave={() => computationStore.setVariableHover(varId, false)}
    >
      <div className="flex flex-col items-center gap-1 hover:outline hover:outline-1 hover:outline-blue-300">
        <div
          ref={type === "input" ? valueDragRef : null}
          className={`${interactiveClass} ${isHovered ? "hovered" : ""}`}
          style={{ cursor: valueCursor }}
        >
          {displayComponent}
        </div>
        {name && (
          <div className="text-xs text-slate-500 text-center">{name}</div>
        )}
      </div>
      {/* Handle for edges to variable nodes positioned above - hidden */}
      <Handle
        type="source"
        position={Position.Top}
        id="label-handle-above"
        style={HANDLE_STYLE}
      />
      {/* Handle for edges to variable nodes positioned below - hidden */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="label-handle-below"
        style={HANDLE_STYLE}
      />
    </div>
  );
});

export default LabelNode;
