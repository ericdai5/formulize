import React, { useCallback, useEffect, useState } from "react";

import { toJS } from "mobx";
import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import LatexLabel from "../../components/latex";
import SVGLabel from "../../components/svg-label";
import { useFormulize } from "../../components/useFormulize";
import { useVariableDrag } from "../../rendering/useVariableDrag";
import { VAR_CLASSES } from "../css-classes";

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

// Default precision for inline inputs
const DEFAULT_INLINE_PRECISION = 2;

// Inline editable input component for variables with interaction: "inline"
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
    const displayPrecision = variable.precision ?? DEFAULT_INLINE_PRECISION;

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
  const { varId, environment } = data;
  const context = useFormulize();
  const computationStore = context?.computationStore;
  const executionStore = context?.executionStore;

  // Must call all hooks before conditional returns
  const showHoverOutlines = computationStore?.showHoverOutlines ?? false;

  const variable = computationStore?.variables.get(varId);
  const isVariableActive = executionStore?.activeVariables.has(varId) ?? false;
  const isHovered = computationStore?.hoverStates.get(varId) ?? false;

  const valueDragRef = useVariableDrag({
    varId,
    role: variable?.role === "input" ? "input" : "output",
    hasDropdownOptions: !!(Array.isArray(variable?.value) || variable?.options),
    computationStore,
  });

  // All conditional returns must happen after all hooks are called
  if (!computationStore || !executionStore) return null;
  if (!variable) return null;
  if (computationStore.isStepMode() && !isVariableActive) return null;

  const { name, role, value, precision, labelDisplay, index, interaction } =
    variable;

  // Get index variable information
  const indexVariable = index;
  let indexDisplay = "";

  if (indexVariable) {
    const indexVar = computationStore.variables.get(indexVariable);
    if (
      indexVar &&
      typeof indexVar.value === "number" &&
      !isNaN(indexVar.value)
    ) {
      // Format precision based on the index variable's precision or default to 0 for integers
      const precision = indexVar.precision ?? 0;
      indexDisplay = `${indexVariable} = ${indexVar.value.toFixed(precision)}`;
    }
  }

  // Determine what to display based on labelDisplay setting and interaction mode
  let mainDisplayText = varId; // default to name
  let displayComponent: React.ReactNode = null;

  // Check if this is an inline input variable
  const isInlineInput = role === "input" && interaction === "inline";

  if (isInlineInput) {
    // Render inline editable input for input variables with inline interaction
    displayComponent = (
      <InlineInput
        varId={varId}
        variable={variable}
        fontSize={environment?.fontSize}
      />
    );
  } else if (labelDisplay === "value") {
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
    } else if (typeof value === "number" && value !== null) {
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
        variable={variable}
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

    if (role === "computed") {
      return VAR_CLASSES.COMPUTED;
    }

    if (role === "input") {
      // All input variables get the unified input class
      return VAR_CLASSES.INPUT;
    }

    return VAR_CLASSES.BASE;
  };

  const interactiveClass = getInteractiveClass();
  const isSetVariable = Array.isArray(variable.value);
  // Don't enable drag for inline input variables
  const isDraggable =
    (role === "input" || role === "computed") &&
    !isSetVariable &&
    !isInlineInput;
  const cursor = isDraggable ? "grab" : "default";
  const valueCursor = isSetVariable
    ? "pointer"
    : role === "input" && !computationStore.isStepMode() && !isInlineInput
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
          ref={
            role === "input" && !isSetVariable && !isInlineInput
              ? valueDragRef
              : null
          }
          className={`${interactiveClass} ${isHovered ? "hovered" : ""}`}
          style={{ cursor: valueCursor }}
        >
          {displayComponent}
        </div>
        {name && labelDisplay !== "value" && (
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
