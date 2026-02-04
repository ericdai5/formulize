import React, { useCallback, useEffect, useState } from "react";

import { toJS } from "mobx";
import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { useFormulize } from "../../core/hooks";
import { debugStore } from "../../store/debug";
import { INPUT_VARIABLE_DEFAULT } from "../../types/variable";
import { buildDebugStyles } from "../../util/debug-styles";
import { useVariableDrag } from "../../util/use-variable-drag";
import { VAR_CLASSES } from "../css-classes";
import LatexLabel from "../latex";
import SVGLabel from "../svg-label";

export interface LabelNodeData {
  varId: string;
  formulaId?: string;
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

// Inline editable input component for variables with input: "inline"
const InlineInput = observer(
  ({
    varId,
    variable,
    fontSize,
  }: {
    varId: string;
    variable: {
      value?: number | (string | number)[];
      precision?: number;
      step?: number;
    };
    fontSize?: number;
  }) => {
    const context = useFormulize();
    const computationStore = context?.computationStore;

    const currentValue =
      typeof variable.value === "number" ? variable.value : 0;
    const displayPrecision =
      variable.precision ?? INPUT_VARIABLE_DEFAULT.PRECISION;

    // Format value with precision for display
    const formatValue = useCallback(
      (val: number) => {
        // Use precision, but don't show trailing zeros for integers
        if (Number.isInteger(val) && displayPrecision === 0) {
          return String(val);
        }
        return val.toFixed(displayPrecision);
      },
      [displayPrecision]
    );

    const [localValue, setLocalValue] = useState<string>(
      formatValue(currentValue)
    );
    const [isFocused, setIsFocused] = useState(false);

    // Sync local value when variable value changes externally
    useEffect(() => {
      if (!isFocused && typeof variable.value === "number") {
        setLocalValue(formatValue(variable.value));
      }
    }, [variable.value, isFocused, formatValue]);

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setLocalValue(newValue);
        const parsed = parseFloat(newValue);
        if (!isNaN(parsed) && computationStore) {
          computationStore.setValue(varId, parsed);
        }
      },
      [varId, computationStore]
    );

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      if (typeof variable.value === "number") {
        setLocalValue(formatValue(variable.value));
      }
    }, [variable.value, formatValue]);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          (event.target as HTMLInputElement).blur();
        }
      },
      []
    );

    return (
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        size={Math.max(localValue.length, 1)}
        className="nodrag inline-input"
        style={{
          width: "auto",
          fontSize: fontSize ? `${fontSize * 2}em` : "1.8em",
          fontFamily: "KaTeX_Main, Times New Roman, serif",
          border: "none",
          background: "transparent",
          textAlign: "center",
          outline: "none",
          padding: "0 0.1em",
          margin: 0,
        }}
      />
    );
  }
);

const LabelNode = observer(({ data }: { data: LabelNodeData }) => {
  const { varId, formulaId } = data;
  const context = useFormulize();
  const computationStore = context?.computationStore;
  const executionStore = context?.executionStore;
  const labelFontSize = computationStore?.environment?.labelFontSize;

  // Must call all hooks before conditional returns
  const variable = computationStore?.variables.get(varId);
  // activeVariables is a Map<formulaId, Set<varId>>
  // Empty string key '' means "all formulas"
  const allFormulasVars = executionStore?.activeVariables.get("") ?? new Set();
  const thisFormulaVars = formulaId
    ? executionStore?.activeVariables.get(formulaId) ?? new Set()
    : new Set();
  const isVariableActive =
    allFormulasVars.has(varId) || thisFormulaVars.has(varId);
  const isHovered = computationStore?.hoverStates.get(varId) ?? false;

  const valueDragRef = useVariableDrag({
    varId,
    isDraggable: variable?.input === "drag",
    hasDropdownOptions: !!(Array.isArray(variable?.value) || variable?.options),
    computationStore,
  });

  // All conditional returns must happen after all hooks are called
  if (!computationStore || !executionStore) return null;
  if (!variable) return null;
  if (computationStore.isStepMode() && !isVariableActive) return null;

  const { name, value, precision, labelDisplay, input } = variable;
  const isStepModeActive = computationStore.isStepMode();

  // Determine what to display based on labelDisplay setting and input mode
  let mainDisplayText = varId; // default to name
  let displayComponent: React.ReactNode = null;

  // Check if this is an inline input variable
  const isInlineInput = input === "inline";

  if (isInlineInput) {
    // Render inline editable input for input variables
    displayComponent = (
      <InlineInput varId={varId} variable={variable} fontSize={labelFontSize} />
    );
  } else if (
    labelDisplay === "value" ||
    false // inline input deprecated
  ) {
    if (Array.isArray(variable?.value)) {
      // Handle set values - convert all elements to strings for display
      const setElements = variable.value.map((el) => String(el));
      const isStringArray = variable.value.every(
        (el) => typeof el === "string"
      );

      if (setElements.length > 0) {
        if (isStringArray) {
          // For string arrays, use smaller non-italic LaTeX text
          mainDisplayText = `\\scriptstyle\\textrm{${setElements.join(", ")}}`;
        } else {
          // For number arrays, use default LaTeX styling
          mainDisplayText = `${setElements.join(", ")}`;
        }
        displayComponent = (
          <LatexLabel latex={mainDisplayText} fontSize={labelFontSize} />
        );
      } else {
        mainDisplayText = "\\emptyset";
        displayComponent = (
          <LatexLabel latex={mainDisplayText} fontSize={labelFontSize} />
        );
      }
    } else if (typeof value === "number" && value !== null) {
      const displayPrecision = precision ?? INPUT_VARIABLE_DEFAULT.PRECISION;
      mainDisplayText = value.toFixed(displayPrecision);
      displayComponent = (
        <LatexLabel latex={mainDisplayText} fontSize={labelFontSize} />
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
        variable={variable}
      />
    );
  } else {
    // Default to name display
    displayComponent = (
      <LatexLabel latex={mainDisplayText} fontSize={labelFontSize} />
    );
  }

  // Determine interactive variable styling based on input type and context
  const getInteractiveClass = () => {
    if (computationStore.isStepMode()) {
      return "step-cue"; // Step mode styling
    }

    if (input === "drag") {
      // Draggable variables get the input class
      return VAR_CLASSES.INPUT;
    }

    return VAR_CLASSES.BASE;
  };

  const interactiveClass = getInteractiveClass();
  const isSetVariable = Array.isArray(variable.value);
  // Don't enable drag for inline input variables or in step mode
  const isDraggableVar =
    input === "drag" && !isSetVariable && !isInlineInput && !isStepModeActive;
  const cursor = isDraggableVar ? "grab" : "default";
  const valueCursor =
    isSetVariable && !isStepModeActive
      ? "pointer"
      : input === "drag" && !isStepModeActive && !isInlineInput
        ? "ns-resize"
        : "default";

  const customStyle = computationStore.environment?.labelNodeStyle
    ? toJS(computationStore.environment.labelNodeStyle)
    : {};

  // Build debug styles that override customStyle when enabled
  const debugStyles = buildDebugStyles(
    debugStore.showLabelBorders,
    debugStore.showLabelShadow
  );

  return (
    <div
      className="label-flow-node text-base text-slate-700"
      style={{
        pointerEvents: "auto",
        width: "auto",
        height: "auto",
        position: "relative",
        cursor,
        ...customStyle,
        ...debugStyles,
      }}
      title={`Variable: ${varId}${name ? ` (${name})` : ""}${isDraggableVar ? " (draggable)" : ""}`}
      onMouseEnter={() => computationStore.setVariableHover(varId, true)}
      onMouseLeave={() => computationStore.setVariableHover(varId, false)}
    >
      <div className="flex flex-col items-center gap-1">
        <div
          ref={
            input === "drag" &&
            !isSetVariable &&
            !isInlineInput &&
            !isStepModeActive
              ? valueDragRef
              : null
          }
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
