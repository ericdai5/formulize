import React, { useCallback, useEffect, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { getInputVariableState } from "../parse/variable";
import { VAR_CLASSES } from "../rendering/css-classes";
import { ComputationStore } from "../store/computation";
import { useFormulize } from "./useFormulize";
import { useMathJax } from "./useMathJax";

type DisplayMode = "symbol" | "value" | "both" | "withUnits";

interface InlineVariableProps {
  /** Variable ID to render */
  id: string;
  /** Display mode: "symbol" (m), "value" (2), "both" (m = 2), "withUnits" (2 kg) */
  display?: DisplayMode;
  /** Optional class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Font scale relative to surrounding text (default: 1) */
  scale?: number;
}

/**
 * Get the appropriate CSS class for variable styling based on role
 */
const getVariableClass = (role?: string): string => {
  switch (role) {
    case "input":
      return VAR_CLASSES.INPUT;
    case "computed":
      return VAR_CLASSES.COMPUTED;
    default:
      return VAR_CLASSES.BASE;
  }
};

/**
 * Inline variable component that renders a single variable within text.
 * Supports hover highlighting and drag-to-change for input variables.
 */
const InlineVariableInner = observer(
  ({
    id,
    display = "value",
    scale = 1,
    computationStore,
  }: {
    id: string;
    display: DisplayMode;
    scale: number;
    computationStore: ComputationStore;
  }) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    const { isLoaded: mathJaxLoaded } = useMathJax();

    // Get the variable from store
    const getVariable = useCallback(() => {
      return computationStore.variables.get(id);
    }, [id, computationStore]);

    // Get hover state for this variable
    const isHovered = computationStore.hoverStates.get(id) ?? false;
    const variable = getVariable();
    const variableClass = getVariableClass(variable?.role);

    // Build LaTeX string based on display mode
    const buildLatex = useCallback((): string | null => {
      const variable = getVariable();
      if (!variable) return null;

      const value = variable.value;
      const units = variable.units;
      const precision = variable.precision ?? 2;

      // Format value
      let formattedValue = "";
      if (typeof value === "number") {
        formattedValue = Number.isInteger(value)
          ? value.toString()
          : value.toFixed(precision);
      } else if (Array.isArray(value)) {
        formattedValue = `\\{${value.join(", ")}\\}`;
      } else {
        formattedValue = "?";
      }

      switch (display) {
        case "symbol":
          return id;
        case "value":
          return formattedValue;
        case "both":
          return `${id} = ${formattedValue}`;
        case "withUnits":
          return units
            ? `${formattedValue} \\, \\text{${units}}`
            : formattedValue;
        default:
          return formattedValue;
      }
    }, [id, display, getVariable]);

    // Render the variable with MathJax
    const renderVariable = useCallback(async () => {
      if (!containerRef.current || !mathJaxLoaded || !window.MathJax) return;

      const latex = buildLatex();
      if (!latex) {
        console.warn(`InlineVariable: Variable not found with id "${id}"`);
        return;
      }

      try {
        const container = containerRef.current;

        // Clear previous MathJax content
        window.MathJax.typesetClear([container]);

        // Create element with inline math mode
        const mathSpan = document.createElement("span");
        mathSpan.style.fontSize = `${scale}em`;
        mathSpan.textContent = `\\(${latex}\\)`;

        // Replace content and typeset
        container.innerHTML = "";
        container.appendChild(mathSpan);
        await window.MathJax.typesetPromise([container]);

        // Attach interaction listeners
        attachInteractionListeners(container);
      } catch (error) {
        console.error("InlineVariable: Render error:", error);
      }
    }, [id, buildLatex, mathJaxLoaded, scale]);

    // Attach hover and drag listeners
    const attachInteractionListeners = useCallback(
      (container: HTMLElement) => {
        const variable = computationStore.variables.get(id);
        if (!variable) return;

        const isInput = variable.role === "input";

        // Make the whole container interactive
        container.style.cursor = isInput ? "ns-resize" : "default";

        // Mouse enter - set hover state
        container.addEventListener("mouseenter", () => {
          computationStore.setVariableHover(id, true);
        });
        // Mouse leave - clear hover state
        container.addEventListener("mouseleave", () => {
          computationStore.setVariableHover(id, false);
        });

        // Add drag-to-change for input variables
        if (isInput) {
          let isDragging = false;
          let startY = 0;
          let startValue = 0;

          const variableState = getInputVariableState(id, computationStore);
          if (!variableState) return;

          const { stepSize, minValue, maxValue } = variableState;

          const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            const deltaY = startY - e.clientY;
            const newValue = startValue + deltaY * stepSize;
            computationStore.setValue(
              id,
              Math.max(minValue, Math.min(maxValue, newValue))
            );
          };

          const handleMouseUp = (e: MouseEvent) => {
            if (isDragging) {
              isDragging = false;
              e.preventDefault();
              e.stopPropagation();
              document.removeEventListener("mousemove", handleMouseMove, true);
              document.removeEventListener("mouseup", handleMouseUp, true);
            }
          };

          const handleMouseDown = (e: MouseEvent) => {
            isDragging = true;
            startY = e.clientY;
            const currentVariable = computationStore.variables.get(id);
            startValue =
              typeof currentVariable?.value === "number"
                ? currentVariable.value
                : 0;
            e.preventDefault();
            e.stopPropagation();

            document.addEventListener("mousemove", handleMouseMove, true);
            document.addEventListener("mouseup", handleMouseUp, true);
          };

          container.addEventListener("mousedown", handleMouseDown);
        }
      },
      [id, computationStore]
    );

    // Initial render when MathJax is ready
    useEffect(() => {
      if (mathJaxLoaded) {
        renderVariable();
      }
    }, [mathJaxLoaded, renderVariable]);

    // Re-render when variable value changes
    useEffect(() => {
      if (!mathJaxLoaded) return;

      const disposer = reaction(
        () => {
          const variable = computationStore.variables.get(id);
          return variable
            ? { value: variable.value, role: variable.role }
            : null;
        },
        () => {
          renderVariable();
        }
      );

      return () => disposer();
    }, [id, mathJaxLoaded, renderVariable, computationStore]);

    return (
      <span
        ref={containerRef}
        className={`inline-variable ${variableClass} ${isHovered ? "hovered" : ""}`}
        style={{ display: "inline", verticalAlign: "baseline" }}
      />
    );
  }
);

/**
 * InlineVariable - Renders a variable inline within text
 *
 * Usage:
 * ```tsx
 * <FormulizeProvider config={config}>
 *   <p>The mass <InlineVariable id="m" display="withUnits" /> affects energy.</p>
 * </FormulizeProvider>
 * ```
 */
export const InlineVariable: React.FC<InlineVariableProps> = observer(
  ({ id, display = "value", className = "", style = {}, scale = 1 }) => {
    const context = useFormulize();
    const instance = context?.instance;
    const isLoading = context?.isLoading ?? true;
    const computationStore = context?.computationStore;

    // Show placeholder while loading or no context
    if (isLoading || !instance || !computationStore) {
      return (
        <span
          className={`inline-variable ${className}`}
          style={{ display: "inline", ...style }}
        >
          ...
        </span>
      );
    }

    return (
      <span
        className={`inline-variable-wrapper ${className}`}
        style={{ display: "inline", ...style }}
      >
        <InlineVariableInner
          id={id}
          display={display}
          scale={scale}
          computationStore={computationStore}
        />
      </span>
    );
  }
);

export default InlineVariable;
