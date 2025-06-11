import { useCallback, useEffect, useRef, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { computationStore } from "../api/computation";
import { FormulaStore } from "../store/FormulaStoreManager";
import { VariableRange, dragInteractionHandlers } from "./dragInteraction";

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

interface FormulaProps {
  variableRanges?: Record<string, VariableRange>;
  formulaIndex?: number;
  formulaStore?: FormulaStore;
}

const Formula = observer(
  ({ variableRanges = {}, formulaIndex, formulaStore }: FormulaProps = {}) => {
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
        } catch (error) {
          console.error("Error initializing MathJax:", error);
        }
      };
      initializeMathJax();
    }, [formulaStore]);

    // Helper function to get expressions to render from the system
    const getFormula = useCallback((): string[] => {
      // If a custom formula store is provided, use its formula
      if (formulaStore) {
        const storeLatex = formulaStore.latexWithoutStyling;
        if (storeLatex) {
          return [storeLatex];
        }
      }

      // If a specific formula index is provided, get that formula
      if (formulaIndex !== undefined && computationStore.displayedFormulas) {
        const specificFormula =
          computationStore.displayedFormulas[formulaIndex];
        if (specificFormula) {
          return [specificFormula];
        }
      }

      // Use displayed formulas from computation store
      if (
        computationStore.displayedFormulas &&
        computationStore.displayedFormulas.length > 0
      ) {
        return computationStore.displayedFormulas;
      }

      return [];
    }, [formulaIndex, formulaStore]);

    const renderFormulas = useCallback(async () => {
      if (!containerRef.current) return;

      // Store the container reference to avoid multiple ref accesses
      const container = containerRef.current;

      try {
        const formula = getFormula();
        if (formula.length === 0) return;

        // Clear previous MathJax content
        window.MathJax.typesetClear([container]);

        // Create container for all expressions
        const expressionsHTML = formula
          .map((latex, index) => {
            // Process the LaTeX to include interactive elements (for display only)
            // First, temporarily replace LaTeX commands to avoid matching letters within them
            const latexCommands: string[] = [];
            const placeholderPrefix = "___LATEXCMD___";

            // Replace LaTeX commands with numbered placeholders
            let tempLatex = latex.replace(
              /\\[a-zA-Z]+(\{[^}]*\}|\[[^\]]*\])*|\\[^a-zA-Z]/g,
              (match) => {
                const index = latexCommands.length;
                latexCommands.push(match);
                return `${placeholderPrefix}${index}___`;
              }
            );

            // Now do variable replacement on the remaining text (which should only contain standalone letters)
            tempLatex = tempLatex.replace(/([a-zA-Z])/g, (match) => {
              const varId = `var-${match}`;
              const variable = computationStore.variables.get(varId);

              if (!variable) {
                return match;
              }

              const value = variable.value;
              const type = variable.type;
              const precision = variable.precision ?? 1; // Default to 1 decimal place if not specified

              if (type === "constant") {
                return value.toString();
              }

              if (type === "input") {
                return `\\cssId{var-${match}}{\\class{interactive-var-slidable}{${match}: ${value.toFixed(precision)}}}`;
              }

              if (type === "dependent") {
                return `\\cssId{var-${match}}{\\class{interactive-var-dependent}{${match}: ${value.toFixed(precision)}}}`;
              }

              return `\\class{interactive-var-${type}}{${match}}`;
            });

            // Restore LaTeX commands from placeholders
            const processedLatex = tempLatex.replace(
              new RegExp(`${placeholderPrefix}(\\d+)___`, "g"),
              (match, index) => {
                return latexCommands[parseInt(index)];
              }
            );

            return `
            <div class="formula-expression" data-expression-index="${index}" style="padding: 1rem; border: 1px solid #e0e0e0; border-radius: 24px; font-size: 0.9em;">
              <div class="expression-formula">\\[${processedLatex}\\]</div>
            </div>
          `;
          })
          .join("");

        container.innerHTML = expressionsHTML;
        await window.MathJax.typesetPromise([container]);

        if (!containerRef.current) {
          console.warn("Container ref became null during async operations");
          return;
        }

        // Set up interaction handlers for each expression
        const expressionElements =
          containerRef.current.querySelectorAll(`.formula-expression`);
        expressionElements.forEach((element) => {
          dragInteractionHandlers(element as HTMLElement, variableRanges);
        });
      } catch (error) {
        console.error("Error rendering formulas:", error);
      }
    }, [getFormula, variableRanges]);

    useEffect(() => {
      const disposer = reaction(
        () => ({
          // Watch for changes in both variable values and types
          variables: Array.from(computationStore.variables.entries()).map(
            ([id, v]) => ({
              id,
              type: v.type,
              value: v.value,
            })
          ),
          variableTypesChanged: computationStore.variableTypesChanged,
          displayedFormulas: computationStore.displayedFormulas,
          formulaIndex: formulaIndex,
          formulaStore: formulaStore?.latexWithoutStyling,
        }),
        async () => {
          if (!isInitialized || !containerRef.current) return;
          await renderFormulas();
        }
      );

      return () => disposer();
    }, [isInitialized, renderFormulas, formulaIndex, formulaStore]);

    useEffect(() => {
      if (isInitialized) {
        renderFormulas();
      }
    }, [isInitialized, renderFormulas]);

    return (
      <div
        ref={containerRef}
        className="formulas-container flex flex-col gap-4"
      />
    );
  }
);

export type { VariableRange, FormulaProps };
export default Formula;
