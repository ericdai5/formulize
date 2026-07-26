import React, { useCallback, useRef } from "react";

import { toJS } from "mobx";
import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { useStore } from "../../core/hooks";
import { debugStore } from "../../store/debug";
import { INPUT_VARIABLE_DEFAULT } from "../../types/variable";
import { buildDebugStyles } from "../../util/debug-styles";
import { formatNumberForLatex } from "../../util/format-number";
import { showInlineEditOverlay } from "../../util/inline-edit-overlay";
import {
  formatInlineLatex,
  toLatexText,
  unwrapMathMode,
} from "../../util/latex-inline";
import { latex as formatLatexNumber } from "../../util/step-label-format";
import { useVariableDrag } from "../../util/use-variable-drag";
import { VAR_CLASSES } from "../css-classes";
import LatexLabel from "../latex";
import SVGLabel from "../svg-label";

interface BaseLabelNodeData {
  formulaId?: string;
}

export interface VariableLabelNodeData extends BaseLabelNodeData {
  labelKind?: "variable";
  varId: string;
}

export interface ExpressionLabelNodeData extends BaseLabelNodeData {
  labelKind: "expression";
  expression: string;
  expressionLabel: string;
}

export type LabelNodeData = VariableLabelNodeData | ExpressionLabelNodeData;

const isExpressionLabelData = (
  data: LabelNodeData
): data is ExpressionLabelNodeData => data.labelKind === "expression";

function formatNumericStepLabelValue(
  value: number,
  options: {
    precision?: number;
    sigFigs?: number;
  } = {}
): string {
  // Step numeric labels should follow variable formatting settings by default.
  if (options.sigFigs !== undefined) {
    return (
      unwrapMathMode(formatLatexNumber(value).sigfigs(options.sigFigs)) ??
      formatNumberForLatex(value, { sigFigs: options.sigFigs })
    );
  }

  const precision = options.precision ?? INPUT_VARIABLE_DEFAULT.PRECISION;
  return (
    unwrapMathMode(formatLatexNumber(value).precision(precision)) ??
    formatNumberForLatex(value, { precision })
  );
}

/**
 * Render step label entry values exactly as provided by the author.
 * Arrays are rendered with square brackets for explicit set/list semantics.
 */
const formatStepLabelValue = (
  value: string | number | (string | number)[] | undefined | null,
  options: {
    precision?: number;
    sigFigs?: number;
  } = {}
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "number") {
    return formatNumericStepLabelValue(value, options);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return toLatexText("[]");
    }
    const listContents = value.map((entry) => String(entry)).join(", ");
    return toLatexText(`[${listContents}]`);
  }
  const inlineLatex = formatInlineLatex(value);
  if (inlineLatex !== null) {
    return inlineLatex;
  }
  return toLatexText(String(value));
};

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

const ExpressionLabelNode = observer(
  ({ data }: { data: ExpressionLabelNodeData }) => {
    const { expression, expressionLabel } = data;
    const context = useStore();
    const computationStore = context?.computationStore;
    const labelFontSize = computationStore?.environment?.labelFontSize;

    const customStyle = computationStore?.environment?.labelNodeStyle
      ? toJS(computationStore.environment.labelNodeStyle)
      : {};

    const debugStyles = buildDebugStyles(
      debugStore.showLabelBorders,
      debugStore.showLabelShadow
    );

    const expressionLabelLatex = formatStepLabelValue(expressionLabel, {
      precision: INPUT_VARIABLE_DEFAULT.PRECISION,
    });

    return (
      <div
        className="label-flow-node text-base"
        style={{
          pointerEvents: "auto",
          width: "auto",
          height: "auto",
          position: "relative",
          cursor: "default",
          ...customStyle,
          ...debugStyles,
        }}
        title={`Expression label: ${expression}`}
      >
        <div className="flex flex-col items-center gap-2">
          <LatexLabel
            latex={expressionLabelLatex || expressionLabel}
            fontSize={labelFontSize}
          />
        </div>
        {/* Handle for edges to expression nodes - hidden */}
        <Handle
          type="source"
          position={Position.Top}
          id="label-handle-above"
          style={HANDLE_STYLE}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="label-handle-below"
          style={HANDLE_STYLE}
        />
      </div>
    );
  }
);

const VariableLabelNode = observer(
  ({ data }: { data: VariableLabelNodeData }) => {
    const { varId, formulaId } = data;
    const context = useStore();
    const computationStore = context?.computationStore;
    const labelFontSize = computationStore?.environment?.labelFontSize;

    // Must call all hooks before conditional returns
    const variable = computationStore?.variables.get(varId);
    // activeVariables is a Map<formulaId, Set<varId>>
    // Empty string key '' means "all formulas"
    const activeVariables = computationStore?.getActiveVariables() ?? new Map();
    const allFormulasVars = activeVariables.get("") ?? new Set();
    const thisFormulaVars = formulaId
      ? activeVariables.get(formulaId) ?? new Set()
      : new Set();
    const isVariableActive =
      allFormulasVars.has(varId) || thisFormulaVars.has(varId);
    // Highlighted if mouse is over OR if dragging this variable
    const isHovered = computationStore?.isVariableHighlighted(varId) ?? false;

    const valueDragRef = useVariableDrag({
      varId,
      isDraggable: variable?.input === "drag",
      hasDropdownOptions: !!(
        Array.isArray(variable?.value) || variable?.options
      ),
      computationStore: computationStore ?? null,
    });

    // Cache the latex value to prevent re-rendering during editing
    // This prevents the LatexLabel from re-typesetting and destroying the input overlay
    const cachedLatexRef = useRef<string>("");

    // Handle click to trigger inline edit overlay
    const handleValueClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!computationStore) return;
        const isInlineInput = variable?.input === "inline";
        const labelDisplay = variable?.labelDisplay ?? "name";
        const isLabelInlineEditable = isInlineInput && labelDisplay === "value";
        if (!isLabelInlineEditable) return;
        if (computationStore.editingStates.get(varId)) return;

        // Find the inner MathJax content element (mjx-mn for numbers, mjx-mi for identifiers)
        // This matches formula-node which targets MJX-MN elements, not the outer MJX-CONTAINER
        const container = e.currentTarget;
        const innerElement = (container.querySelector("mjx-mn") ??
          container.querySelector("mjx-mi") ??
          container.querySelector("mjx-mrow")) as HTMLElement;
        if (innerElement) {
          showInlineEditOverlay({
            varId,
            element: innerElement,
            computationStore,
          });
        }
      },
      [varId, computationStore, variable?.input, variable?.labelDisplay]
    );

    // All conditional returns must happen after all hooks are called
    if (!computationStore) return null;
    if (!variable) return null;

    const { name, precision, sigFigs, labelDisplay, input } = variable;
    const isStepModeActive = computationStore.isStepMode();
    const isInputVariable = input === "drag" || input === "inline";
    const stepView = isStepModeActive
      ? formulaId
        ? computationStore.getViewForFormula(formulaId)
        : computationStore.currentStep?.formulas?.[""]
      : undefined;
    const hasStepLabelEntry =
      !!stepView?.labels &&
      Object.prototype.hasOwnProperty.call(stepView.labels, varId);
    const stepLabelOverride = hasStepLabelEntry
      ? stepView?.labels?.[varId]
      : undefined;
    const shouldHideValueFromStepLabel =
      hasStepLabelEntry && stepLabelOverride == null;

    // In step mode, hide non-active variables UNLESS they are input variables
    // Input variables must always be visible for user interaction
    if (isStepModeActive && !isVariableActive && !isInputVariable) {
      return null;
    }

    // In step mode, use the isolated stepValues for display (faster rendering)
    // For input variables, always use their actual value (not step value)
    // In normal mode, use the variable's value from the main variables map
    const value =
      isStepModeActive && !isInputVariable
        ? computationStore.getDisplayValue(varId)
        : variable.value;

    // Determine what to display based on labelDisplay setting and input mode
    let mainDisplayText = varId; // default to name
    let displayComponent: React.ReactNode = null;

    // Check if this is an inline input variable
    const isInlineInput = input === "inline";

    // Check if we're currently editing this variable
    const isEditing = computationStore.editingStates.get(varId);

    if (hasStepLabelEntry) {
      if (shouldHideValueFromStepLabel) {
        // Explicit null/undefined override means "hide value display for this variable".
        if (!name) {
          return null;
        }
      } else {
        const displayPrecision = precision ?? INPUT_VARIABLE_DEFAULT.PRECISION;
        const overrideLatex = formatStepLabelValue(stepLabelOverride, {
          precision: displayPrecision,
          sigFigs,
        });
        if (overrideLatex) {
          mainDisplayText = overrideLatex;
          displayComponent = (
            <LatexLabel latex={mainDisplayText} fontSize={labelFontSize} />
          );
        } else if (!name) {
          return null;
        }
      }
    } else if (
      labelDisplay === "value" ||
      false // inline input deprecated
    ) {
      if (Array.isArray(value)) {
        // Handle set values - convert all elements to strings for display
        const setElements = value.map((el) => String(el));
        const isStringArray = value.every((el) => typeof el === "string");

        if (setElements.length > 0) {
          const bracketedValues = `[${setElements.join(", ")}]`;
          if (isStringArray) {
            // For string arrays, use smaller non-italic LaTeX text
            mainDisplayText = `\\scriptstyle\\textrm{${bracketedValues}}`;
          } else {
            // For number arrays, use default LaTeX styling
            mainDisplayText = bracketedValues;
          }
          displayComponent = (
            <LatexLabel latex={mainDisplayText} fontSize={labelFontSize} />
          );
        } else {
          mainDisplayText = "[]";
          displayComponent = (
            <LatexLabel latex={mainDisplayText} fontSize={labelFontSize} />
          );
        }
      } else if (typeof value === "number" && value !== null) {
        const displayPrecision = precision ?? INPUT_VARIABLE_DEFAULT.PRECISION;
        mainDisplayText = formatNumberForLatex(value, {
          precision: displayPrecision,
          sigFigs,
        });
        // When editing, use cached latex to prevent re-rendering that destroys the input overlay
        // Only update the cache when not editing
        if (!isEditing) {
          cachedLatexRef.current = mainDisplayText;
        }
        const displayLatex = isEditing
          ? cachedLatexRef.current || mainDisplayText
          : mainDisplayText;
        displayComponent = (
          <LatexLabel latex={displayLatex} fontSize={labelFontSize} />
        );
      } else if (isStepModeActive && isVariableActive) {
        // In step mode, active variables should always show something
        // even if the value is temporarily unavailable - show a placeholder
        mainDisplayText = "\\cdots";
        displayComponent = (
          <LatexLabel latex={mainDisplayText} fontSize={labelFontSize} />
        );
      } else if (name) {
        // If labelDisplay is "value" but no value, just show the name (handled below)
        // Don't set displayComponent - let only the name render
      } else {
        // If labelDisplay is "value" but no value is set and no name, hide the label node
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
      const classes: string[] = [];

      // All augmented variables share a marker; input mode is a modifier.
      classes.push(
        VAR_CLASSES.ALL,
        isInputVariable ? VAR_CLASSES.INPUT : VAR_CLASSES.BASE
      );

      // In step mode, active variables get step-cue for pulse animation
      if (isStepModeActive && isVariableActive) {
        classes.push("step-cue");
      }

      return classes.join(" ");
    };

    const interactiveClass = getInteractiveClass();
    const isSetVariable = Array.isArray(value);
    // Enable drag for input variables even in step mode (so users can change values)
    const isDraggableVar = input === "drag" && !isSetVariable && !isInlineInput;
    const cursor = isDraggableVar ? "grab" : "default";

    // Determine if inline editing is enabled for this label
    const isLabelInlineEditable = isInlineInput && labelDisplay === "value";

    const valueCursor = isLabelInlineEditable
      ? "text"
      : isSetVariable && !isStepModeActive
        ? "pointer"
        : input === "drag" && !isInlineInput
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
        className="label-flow-node text-base"
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
        onMouseEnter={() => {
          computationStore.setVariableHover(varId, true);
        }}
        onMouseLeave={() => {
          computationStore.setVariableHover(varId, false);
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {displayComponent && (
            <div
              ref={
                input === "drag" && !isSetVariable && !isInlineInput
                  ? valueDragRef
                  : null
              }
              className={`${interactiveClass} ${isHovered ? "hovered" : ""}`}
              style={{ cursor: valueCursor }}
              onClick={isLabelInlineEditable ? handleValueClick : undefined}
            >
              {displayComponent}
            </div>
          )}
          {name && (
            <div style={{ lineHeight: 1 }}>
              <LatexLabel
                latex={`\\text{${name}}`}
                fontSize={labelFontSize ? labelFontSize * 0.67 : 0.67}
              />
            </div>
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
  }
);

const LabelNode = ({ data }: { data: LabelNodeData }) => {
  if (isExpressionLabelData(data)) {
    return <ExpressionLabelNode data={data} />;
  }
  return <VariableLabelNode data={data} />;
};

export default LabelNode;
