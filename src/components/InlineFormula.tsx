import React, { useCallback, useEffect, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { getInputVariableState, processLatexContent } from "../parse/variable";
import { injectVariableSVGs } from "../rendering/svg/svg-processor";
import { ComputationStore } from "../store/computation";
import { ExecutionStore } from "../store/execution";
import { useFormulize } from "./useFormulize";
import { useMathJax } from "./useMathJax";

interface InlineFormulaProps {
  /** Formula ID to render (looks up from environment) */
  id: string;
  /** Optional class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Font scale relative to surrounding text (default: 1) */
  scale?: number;
}

/**
 * Inline formula component that renders MathJax formulas within text.
 * No React Flow canvas, no labels, no drag handles - just the formula.
 */
const InlineFormulaInner = observer(
  ({
    id,
    scale = 1,
    computationStore,
    executionStore,
  }: {
    id: string;
    scale?: number;
    computationStore: ComputationStore;
    executionStore: ExecutionStore;
  }) => {
    const containerRef = useRef<HTMLSpanElement>(null);
    const { isLoaded: mathJaxLoaded } = useMathJax();

    // Get formula latex by ID
    const getFormulaLatex = useCallback((): string | null => {
      const formulas = computationStore.environment?.formulas;
      if (!formulas) return null;
      const formula = formulas.find((f) => f.id === id);
      return formula?.latex || null;
    }, [id, computationStore.environment?.formulas]);

    // Render the formula with MathJax
    const renderFormula = useCallback(async () => {
      if (!containerRef.current || !mathJaxLoaded || !window.MathJax) return;

      const latex = getFormulaLatex();
      if (!latex) {
        console.warn(`InlineFormula: Formula not found with id "${id}"`);
        return;
      }

      try {
        const container = containerRef.current;

        // Clear previous MathJax content
        window.MathJax.typesetClear([container]);

        // Process LaTeX to add interactive variable CSS classes
        let processedLatex: string;
        try {
          processedLatex = processLatexContent(
            latex,
            2,
            computationStore,
            executionStore
          );
        } catch (e) {
          console.warn(
            "InlineFormula: LaTeX processing failed, using raw latex"
          );
          processedLatex = latex;
        }

        // Create element with inline math mode (no \displaystyle for true inline)
        // Use scale prop (default 1) to match surrounding text
        const mathSpan = document.createElement("span");
        mathSpan.style.fontSize = `${scale}em`;
        mathSpan.textContent = `\\(${processedLatex}\\)`;

        // Replace content and typeset
        container.innerHTML = "";
        container.appendChild(mathSpan);
        await window.MathJax.typesetPromise([container]);

        // Inject SVG elements for variables after MathJax rendering
        try {
          injectVariableSVGs(container, computationStore);
        } catch (svgError) {
          console.error(
            "InlineFormula: Error injecting variable SVGs:",
            svgError
          );
        }

        // After rendering, attach hover and drag event listeners to variable elements
        attachVariableInteractionListeners(container);
      } catch (error) {
        console.error("InlineFormula: Render error:", error);
      }
    }, [
      id,
      getFormulaLatex,
      mathJaxLoaded,
      computationStore,
      executionStore,
      scale,
    ]);

    // Attach hover and drag listeners to elements with variable IDs
    const attachVariableInteractionListeners = useCallback(
      (container: HTMLElement) => {
        // Get all variable IDs from the computation store
        const variableIds = Array.from(computationStore.variables.keys());

        variableIds.forEach((varId) => {
          const variable = computationStore.variables.get(varId);
          const isInput = variable?.role === "input";
          const elements = container.querySelectorAll(`#${CSS.escape(varId)}`);

          elements.forEach((element) => {
            const el = element as HTMLElement;

            // Mouse enter - set hover state
            el.addEventListener("mouseenter", () => {
              computationStore.setVariableHover(varId, true);
            });
            // Mouse leave - clear hover state
            el.addEventListener("mouseleave", () => {
              computationStore.setVariableHover(varId, false);
            });

            // Add drag-to-change for input variables
            if (isInput) {
              el.style.cursor = "ns-resize";

              let isDragging = false;
              let startY = 0;
              let startValue = 0;

              const variableState = getInputVariableState(
                varId,
                computationStore
              );
              if (!variableState) return;

              const { stepSize, minValue, maxValue } = variableState;

              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging) return;
                e.preventDefault();
                e.stopPropagation();
                const deltaY = startY - e.clientY;
                const newValue = startValue + deltaY * stepSize;
                computationStore.setValue(
                  varId,
                  Math.max(minValue, Math.min(maxValue, newValue))
                );
              };

              const handleMouseUp = (e: MouseEvent) => {
                if (isDragging) {
                  isDragging = false;
                  e.preventDefault();
                  e.stopPropagation();
                  document.removeEventListener(
                    "mousemove",
                    handleMouseMove,
                    true
                  );
                  document.removeEventListener("mouseup", handleMouseUp, true);
                }
              };

              const handleMouseDown = (e: MouseEvent) => {
                isDragging = true;
                startY = e.clientY;
                // Get current value at drag start
                const currentVariable = computationStore.variables.get(varId);
                startValue =
                  typeof currentVariable?.value === "number"
                    ? currentVariable.value
                    : 0;
                e.preventDefault();
                e.stopPropagation();

                document.addEventListener("mousemove", handleMouseMove, true);
                document.addEventListener("mouseup", handleMouseUp, true);
              };

              el.addEventListener("mousedown", handleMouseDown);
            }
          });
        });
      },
      [computationStore]
    );

    // Initial render when MathJax is ready
    useEffect(() => {
      if (mathJaxLoaded) {
        renderFormula();
      }
    }, [mathJaxLoaded, renderFormula]);

    // Re-render when variables change
    useEffect(() => {
      if (!mathJaxLoaded) return;

      const disposer = reaction(
        () => {
          // Track variable values for reactivity
          const entries = Array.from(computationStore.variables.entries());
          return entries.map(([id, v]) => ({ id, value: v.value }));
        },
        () => {
          renderFormula();
        }
      );

      return () => disposer();
    }, [mathJaxLoaded, renderFormula, computationStore]);

    // React to hover state changes and update DOM directly
    useEffect(() => {
      const disposer = reaction(
        () => Array.from(computationStore.hoverStates.entries()),
        (hoverStates) => {
          if (!containerRef.current) return;
          hoverStates.forEach(([varId, isHovered]) => {
            const elements = containerRef.current!.querySelectorAll(
              `#${CSS.escape(varId)}`
            );
            elements.forEach((element) => {
              if (isHovered) {
                element.classList.add("hovered");
              } else {
                element.classList.remove("hovered");
              }
            });
          });
        }
      );
      return () => disposer();
    }, [computationStore]);

    return (
      <span
        ref={containerRef}
        className="inline-formula rendered-latex"
        style={{ display: "inline", verticalAlign: "baseline" }}
      />
    );
  }
);

/**
 * InlineFormula - Renders a formula inline within text
 *
 * Usage:
 * ```tsx
 * <FormulizeProvider config={config}>
 *   <p>The formula <InlineFormula id="kinetic-energy" /> shows energy.</p>
 * </FormulizeProvider>
 * ```
 */
export const InlineFormula: React.FC<InlineFormulaProps> = observer(
  ({ id, className = "", style = {}, scale = 1 }) => {
    const context = useFormulize();
    const instance = context?.instance;
    const isLoading = context?.isLoading ?? true;
    const computationStore = context?.computationStore;
    const executionStore = context?.executionStore;

    // Show placeholder while loading or no context
    if (isLoading || !instance || !computationStore || !executionStore) {
      return (
        <span
          className={`inline-formula ${className}`}
          style={{ display: "inline", ...style }}
        >
          ...
        </span>
      );
    }

    return (
      <span
        className={`inline-formula-wrapper ${className}`}
        style={{ display: "inline", ...style }}
      >
        <InlineFormulaInner
          id={id}
          scale={scale}
          computationStore={computationStore}
          executionStore={executionStore}
        />
      </span>
    );
  }
);

export default InlineFormula;
