import React, { useCallback, useEffect, useRef, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { getInputVariableState, processLatexContent } from "../parse/variable";
import { computationStore } from "../store/computation";
import { useMathJax } from "./useMathJax";

interface EmbeddedFormulaProps {
  /** Formula ID to render (looks up from environment) */
  id: string;
  /** Optional: Direct LaTeX string (overrides id lookup) */
  latex?: string;
  /**
   * Optional: Abbreviated LaTeX to show by default.
   * If provided, the formula will show this abbreviated version normally,
   * and expand to show the full formula on hover.
   * The full formula is either the `latex` prop or looked up by `id`.
   */
  abbreviation?: string;
  /** Font scale (default: 0.7 for compact display) */
  scale?: number;
  /** Whether to highlight when formula is hovered via hover system */
  highlightOnHover?: boolean;
  /** Callback when this formula is hovered */
  onHover?: (isHovered: boolean) => void;
  /** Optional class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

/**
 * EmbeddedFormula - A lightweight formula component for embedding within visualizations.
 *
 * Unlike InlineFormula, this component:
 * - Is designed to be embedded within SVG foreignObject or other visualization contexts
 * - Supports bidirectional hover highlighting with the visualization
 * - Has a more compact default scale
 * - Triggers formula hover events for visualization synchronization
 * - Optionally supports abbreviated display that expands on hover
 *
 * @example Basic usage
 * ```tsx
 * <foreignObject x={100} y={50} width={200} height={50}>
 *   <EmbeddedFormula
 *     id="formula_z_1_1"
 *     highlightOnHover={true}
 *   />
 * </foreignObject>
 * ```
 *
 * @example With abbreviation (expands on hover)
 * ```tsx
 * <EmbeddedFormula
 *   id="formula_h_1_1"
 *   abbreviation="h_1^{(1)}"  // Shows this by default
 *   // On hover, shows full formula looked up by id
 * />
 * ```
 */
export const EmbeddedFormula: React.FC<EmbeddedFormulaProps> = observer(
  ({
    id,
    latex: directLatex,
    abbreviation,
    scale = 0.7,
    highlightOnHover = true,
    onHover,
    className = "",
    style = {}
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { isLoaded: mathJaxLoaded } = useMathJax();
    const [isExpanded, setIsExpanded] = useState(false);

    // Get formula latex by ID or use direct latex
    const getFullLatex = useCallback((): string | null => {
      if (directLatex) return directLatex;
      const formulas = computationStore.environment?.formulas;
      if (!formulas) return null;
      const formula = formulas.find((f) => f.id === id);
      return formula?.latex || null;
    }, [id, directLatex]);

    // Determine which latex to display based on abbreviation and hover state
    const getDisplayLatex = useCallback((): string | null => {
      // If we have an abbreviation and we're not expanded, show abbreviated
      if (abbreviation && !isExpanded) {
        return abbreviation;
      }
      // Otherwise show the full formula
      return getFullLatex();
    }, [abbreviation, isExpanded, getFullLatex]);

    // Attach hover and drag listeners to elements with variable IDs
    const attachVariableInteractionListeners = useCallback((container: HTMLElement) => {
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

            const variableState = getInputVariableState(varId);
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
                document.removeEventListener("mousemove", handleMouseMove, true);
                document.removeEventListener("mouseup", handleMouseUp, true);
              }
            };

            const handleMouseDown = (e: MouseEvent) => {
              isDragging = true;
              startY = e.clientY;
              // Get current value at drag start
              const currentVariable = computationStore.variables.get(varId);
              startValue = typeof currentVariable?.value === "number" ? currentVariable.value : 0;
              e.preventDefault();
              e.stopPropagation();

              document.addEventListener("mousemove", handleMouseMove, true);
              document.addEventListener("mouseup", handleMouseUp, true);
            };

            el.addEventListener("mousedown", handleMouseDown);
          }
        });
      });
    }, []);

    // Render the formula with MathJax
    const renderFormula = useCallback(async () => {
      if (!containerRef.current || !mathJaxLoaded || !window.MathJax) return;

      const latex = getDisplayLatex();
      if (!latex) {
        console.warn(`EmbeddedFormula: Formula not found with id "${id}"`);
        return;
      }

      try {
        const container = containerRef.current;

        // Clear previous MathJax content
        window.MathJax.typesetClear([container]);

        // Process LaTeX to add interactive variable CSS classes
        let processedLatex: string;
        try {
          processedLatex = processLatexContent(latex);
        } catch (e) {
          console.warn("EmbeddedFormula: LaTeX processing failed, using raw latex");
          processedLatex = latex;
        }

        // Create element with inline math mode
        const mathSpan = document.createElement("span");
        mathSpan.style.fontSize = `${scale}em`;
        mathSpan.textContent = `\\(${processedLatex}\\)`;

        // Replace content and typeset
        container.innerHTML = "";
        container.appendChild(mathSpan);
        await window.MathJax.typesetPromise([container]);

        // After rendering, attach hover and drag event listeners to variable elements
        attachVariableInteractionListeners(container);
      } catch (error) {
        console.error("EmbeddedFormula: Render error:", error);
      }
    }, [id, getDisplayLatex, mathJaxLoaded, scale, attachVariableInteractionListeners]);

    // Initial render and re-render when expansion state changes
    useEffect(() => {
      if (mathJaxLoaded) {
        renderFormula();
      }
    }, [mathJaxLoaded, renderFormula, isExpanded]);

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
    }, [mathJaxLoaded, renderFormula]);

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
    }, []);

    // React to formula hover state (from visualization hover)
    useEffect(() => {
      if (!highlightOnHover) return;

      const disposer = reaction(
        () => computationStore.getFormulaHover(id),
        (isHovered) => {
          if (!containerRef.current) return;
          if (isHovered) {
            containerRef.current.classList.add("formula-highlighted");
          } else {
            containerRef.current.classList.remove("formula-highlighted");
          }
        }
      );
      return () => disposer();
    }, [id, highlightOnHover]);

    // Handle mouse events for bidirectional hover and abbreviation expansion
    const handleMouseEnter = useCallback(() => {
      computationStore.setFormulaHover(id, true);
      if (abbreviation) {
        setIsExpanded(true);
      }
      onHover?.(true);
    }, [id, abbreviation, onHover]);

    const handleMouseLeave = useCallback(() => {
      computationStore.setFormulaHover(id, false);
      if (abbreviation) {
        setIsExpanded(false);
      }
      onHover?.(false);
    }, [id, abbreviation, onHover]);

    return (
      <div
        ref={containerRef}
        className={`embedded-formula rendered-latex ${className}`}
        style={{
          display: "inline-block",
          padding: "2px 4px",
          borderRadius: "4px",
          transition: "background-color 0.15s ease",
          cursor: abbreviation ? "pointer" : "default",
          ...style,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    );
  }
);

/**
 * @deprecated Use EmbeddedFormula with the `abbreviation` prop instead.
 *
 * AbbreviatedFormula is now just an alias for backwards compatibility.
 */
export const AbbreviatedFormula: React.FC<
  Omit<EmbeddedFormulaProps, "latex" | "abbreviation"> & {
    abbreviatedLatex: string;
    fullLatex?: string;
  }
> = observer(({ abbreviatedLatex, fullLatex, ...props }) => {
  return (
    <EmbeddedFormula
      {...props}
      abbreviation={abbreviatedLatex}
      latex={fullLatex}
    />
  );
});

export default EmbeddedFormula;
