import { useCallback, useEffect, useRef, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { computationStore } from "../computation";
import { formulaStore } from "../store";
import { VariableRange, dragInteractionHandlers } from "./dragInteraction";

/**
 * BlockInteractivity Component with Custom Variable Ranges
 *
 * This component now accepts custom min/max ranges for each slidable variable.
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

    const renderFormula = useCallback(async () => {
      if (!containerRef.current) return;

      try {
        const latex = formulaStore.latexWithoutStyling;
        if (!latex) return;

        // Store the original LaTeX for computation
        const originalLatex = latex;

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

        // Clear previous MathJax content
        window.MathJax.typesetClear([containerRef.current]);

        // Update content and typeset
        containerRef.current.innerHTML = `\\[${processedLatex}\\]`;
        await window.MathJax.typesetPromise([containerRef.current]);

        // Make sure to set the original formula for computation
        await computationStore.setFormula(originalLatex);

        // Interaction handlers with variable ranges
        dragInteractionHandlers(
          containerRef.current,
          defaultMin,
          defaultMax,
          variableRanges
        );
      } catch (error) {
        console.error("Error rendering formula:", error);
      }
    }, [variableRanges, defaultMin, defaultMax]);

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
        }),
        async () => {
          if (!isInitialized || !containerRef.current) return;
          await renderFormula();
        }
      );

      return () => disposer();
    }, [isInitialized, renderFormula]);

    useEffect(() => {
      if (isInitialized) {
        renderFormula();
      }
    }, [isInitialized, renderFormula]);

    return <div ref={containerRef} />;
  }
);

export type { VariableRange, BlockInteractivityProps };
export default BlockInteractivity;
