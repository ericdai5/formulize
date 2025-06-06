import { useCallback, useEffect, useRef, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { computationStore } from "../computation";
import { formulaStore } from "../store";
import { VariableRange, dragInteractionHandlers } from "./dragInteraction";

/**
 * BlockInteractivity Component with Custom Variable Ranges and Multiple Expressions Support
 *
 * This component automatically detects and renders multiple expressions from the formula system.
 *
 * Usage Examples:
 *
 * 1. Basic usage with default ranges (-100 to 100):
 * <BlockInteractivity />
 *
 * 2. Custom default ranges:
 * <BlockInteractivity defaultMin={0} defaultMax={50} />
 *
 * 3. Variable-specific ranges:
 * <BlockInteractivity
 *   variableRanges={{
 *     'var-a': { min: 0, max: 100 },    // Variable 'a' ranges from 0 to 100
 *     'var-b': { min: -50, max: 50 },   // Variable 'b' ranges from -50 to 50
 *     'c': { min: 1, max: 10 }          // Variable 'c' ranges from 1 to 10 (can use symbol directly)
 *   }}
 *   defaultMin={-10}
 *   defaultMax={10}
 * />
 */

declare global {
  interface Window {
    MathJax: {
      startup: {
        promise: Promise<void>;
      };
      typesetPromise: (elements: HTMLElement[]) => Promise<void>;
      typesetClear: (elements: HTMLElement[]) => void;
    };
  }
}

interface BlockInteractivityProps {
  variableRanges?: Record<string, VariableRange>;
  defaultMin?: number;
  defaultMax?: number;
}

const BlockInteractivity = observer(
  ({
    variableRanges = {},
    defaultMin = -100,
    defaultMax = 100,
  }: BlockInteractivityProps = {}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
      const initializeMathJax = async () => {
        if (!window.MathJax) {
          console.error("MathJax not loaded");
          return;
        }

        try {
          await window.MathJax.startup.promise;
          setIsInitialized(true);
          // Set initial formula when MathJax is ready
          const latex = formulaStore.latexWithoutStyling;
          if (latex) {
            await computationStore.setFormula(latex);
          }
        } catch (error) {
          console.error("Error initializing MathJax:", error);
        }
      };

      initializeMathJax();
    }, []);

    // Helper function to get expressions to render from the system
    const getExpressionsToRender = useCallback((): string[] => {
      // First check if we have original expressions stored in computationStore
      if (
        computationStore.originalExpressions &&
        computationStore.originalExpressions.length > 0
      ) {
        return computationStore.originalExpressions;
      }

      // Fallback to formulaStore for backward compatibility
      const storeLatex = formulaStore.latexWithoutStyling;
      if (!storeLatex) {
        return [];
      }

      // For backward compatibility, treat the single LaTeX from the store as one expression
      return [storeLatex];
    }, []);

    const renderFormulas = useCallback(async () => {
      if (!containerRef.current) return;

      // Store the container reference to avoid multiple ref accesses
      const container = containerRef.current;

      try {
        const expressionsToRender = getExpressionsToRender();
        if (expressionsToRender.length === 0) return;

        // Clear previous MathJax content
        window.MathJax.typesetClear([container]);

        // Create container for all expressions
        const expressionsHTML = expressionsToRender
          .map((latex, index) => {
            // Process the LaTeX to include interactive elements (for display only)
            const processedLatex = latex.replace(/([a-zA-Z])/g, (match) => {
              const varId = `var-${match}`;
              const variable = computationStore.variables.get(varId);

              if (!variable) {
                return match;
              }

              const value = variable.value;
              const type = variable.type;

              if (type === "fixed") {
                return value.toString();
              }

              if (type === "slidable") {
                return `\\cssId{var-${match}}{\\class{interactive-var-slidable}{${match}: ${value.toFixed(1)}}}`;
              }

              if (type === "dependent") {
                return `\\cssId{var-${match}}{\\class{interactive-var-dependent}{${match}: ${value.toFixed(1)}}}`;
              }

              return `\\class{interactive-var-${type}}{${match}}`;
            });

            return `
            <div class="formula-expression" data-expression-index="${index}" style="padding: 1rem; border: 1px solid #e0e0e0; border-radius: 24px;">
              <div class="expression-formula">\\[${processedLatex}\\]</div>
            </div>
          `;
          })
          .join("");

        // Update content and typeset
        container.innerHTML = expressionsHTML;
        await window.MathJax.typesetPromise([container]);

        // Set the original formula for computation (use the first expression)
        const originalLatex = expressionsToRender[0];
        await computationStore.setFormula(originalLatex);

        // Check if container is still available after async operations
        if (!containerRef.current) {
          console.warn("Container ref became null during async operations");
          return;
        }

        // Set up interaction handlers for each expression
        const expressionElements =
          containerRef.current.querySelectorAll(`.formula-expression`);
        expressionElements.forEach((element) => {
          dragInteractionHandlers(
            element as HTMLElement,
            defaultMin,
            defaultMax,
            variableRanges
          );
        });
      } catch (error) {
        console.error("Error rendering formulas:", error);
      }
    }, [getExpressionsToRender, variableRanges, defaultMin, defaultMax]);

    useEffect(() => {
      const disposer = reaction(
        () => ({
          latex: formulaStore.latexWithoutStyling,
          // Watch for changes in both variable values and types
          variables: Array.from(computationStore.variables.entries()).map(
            ([id, v]) => ({
              id,
              type: v.type,
              value: v.value,
            })
          ),
          variableTypesChanged: computationStore.variableTypesChanged,
          // Watch for changes in original expressions
          originalExpressions: computationStore.originalExpressions,
        }),
        async () => {
          if (!isInitialized || !containerRef.current) return;
          await renderFormulas();
        }
      );

      return () => disposer();
    }, [isInitialized, renderFormulas]);

    useEffect(() => {
      if (isInitialized) {
        renderFormulas();
      }
    }, [isInitialized, renderFormulas]);

    return (
      <div
        ref={containerRef}
        className="block-interactivity-container flex flex-col gap-4"
      />
    );
  }
);

export type { VariableRange, BlockInteractivityProps };
export default BlockInteractivity;
