import { observer } from "mobx-react-lite";
import { toJS } from "mobx";

import { Handle, Position } from "@xyflow/react";

import LatexLabel from "../../components/latex";
import SVGLabel from "../../components/svg-label";
import { useVariableDrag } from "../../rendering/useVariableDrag";
import { computationStore } from "../../store/computation";
import { executionStore } from "../../store/execution";

export interface LabelNodeData {
  varId: string;
  environment?: any;
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
  const { varId, environment } = data;
  const showHoverOutlines = computationStore.showHoverOutlines;

  const variable = computationStore.variables.get(varId);
  const isVariableActive = executionStore.activeVariables.has(varId);
  const isHovered = computationStore.hoverStates.get(varId) ?? false;

  const valueDragRef = useVariableDrag({
    varId,
    type: variable?.type === "input" ? "input" : "output",
    hasDropdownOptions: !!(Array.isArray(variable?.value) || variable?.options),
  });

  // All conditional returns must happen after all hooks are called
  if (!variable) return null;
  if (computationStore.isStepMode() && !isVariableActive) return null;

  const { name, type, value, precision, labelDisplay, index } = variable;

  // Get index variable information
  const indexVariable = index;
  let indexDisplay = "";

  if (indexVariable) {
    const indexVar = computationStore.variables.get(indexVariable);
    if (indexVar && typeof indexVar.value === 'number' && !isNaN(indexVar.value)) {
      // Format precision based on the index variable's precision or default to 0 for integers
      const precision = indexVar.precision ?? 0;
      indexDisplay = `${indexVariable} = ${indexVar.value.toFixed(precision)}`;
    }
  }

  // Determine what to display based on labelDisplay setting
  let mainDisplayText = varId; // default to name
  let displayComponent: React.ReactNode = null;

  if (labelDisplay === "value") {
    if (Array.isArray(variable?.value)) {
      // Handle set values - convert all elements to strings for display
      const setElements = variable.value.map((el) => String(el));
      const isStringArray = variable.value.every((el) => typeof el === 'string');

      if (setElements.length > 0) {
        if (isStringArray) {
          // For string arrays, use smaller non-italic LaTeX text
          mainDisplayText = `\\scriptstyle\\textrm{${setElements.join(", ")}}`;
        } else {
          // For number arrays, use default LaTeX styling
          mainDisplayText = `${setElements.join(", ")}`;
        }
        displayComponent = (
          <LatexLabel
            latex={mainDisplayText}
            fontSize={environment?.fontSize}
          />
        );
      } else {
        mainDisplayText = "\\emptyset";
        displayComponent = (
          <LatexLabel
            latex={mainDisplayText}
            fontSize={environment?.fontSize}
          />
        );
      }
    } else if (typeof value === 'number' && value !== null) {
      const displayPrecision = precision ?? (Number.isInteger(value) ? 0 : 2);
      mainDisplayText = value.toFixed(displayPrecision);
      displayComponent = (
        <LatexLabel latex={mainDisplayText} fontSize={environment?.fontSize} />
      );
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
    displayComponent = (
      <LatexLabel latex={displayLatex} fontSize={environment?.fontSize} />
    );
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
      // All input variables get the unified input class
      return "interactive-var-input";
    }

    return "interactive-var-base";
  };

  const interactiveClass = getInteractiveClass();
  const isSetVariable = Array.isArray(variable.value);
  const isDraggable =
    (type === "input" || type === "dependent") && !isSetVariable;
  const cursor = isDraggable ? "grab" : "default";
  const valueCursor = isSetVariable
    ? "pointer"
    : type === "input" && !computationStore.isStepMode()
      ? "ns-resize"
      : "default";

  const customStyle = computationStore.environment?.labelNodeStyle
    ? toJS(computationStore.environment.labelNodeStyle)
    : {};

  return (
    <div
      className="label-flow-node text-base text-slate-700"
      data-show-hover-outlines={showHoverOutlines}
      style={{
        pointerEvents: "auto",
        width: "auto",
        height: "auto",
        position: "relative",
        cursor,
        ...customStyle,
      }}
      title={`Variable: ${varId}${name ? ` (${name})` : ""}${indexDisplay ? ` [${indexDisplay}]` : ""}${isDraggable ? " (draggable)" : ""}`}
      onMouseEnter={() => computationStore.setVariableHover(varId, true)}
      onMouseLeave={() => computationStore.setVariableHover(varId, false)}
    >
      <div
        className={`flex flex-col items-center gap-1 ${showHoverOutlines ? "hover:outline hover:outline-1 hover:outline-blue-300" : ""}`}
      >
        <div
          ref={type === "input" && !isSetVariable ? valueDragRef : null}
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
