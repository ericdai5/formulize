import { useCallback, useEffect, useRef, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { computationStore } from "../api/computation";
import { processLatexContent } from "../api/variableProcessing";
import ControlPanel from "../components/controls/controls";
import { FormulaStore } from "../store/FormulaStoreManager";
import { IControls } from "../types/control";
import { IEnvironment } from "../types/environment";
import { dragHandler } from "./dragHandler";
import { dropdownHandler } from "./dropdownHandler";
import { stepHandler } from "./stepHandler";

export type VariableRange = [number, number];

interface FormulaProps {
  variableRanges?: Record<string, VariableRange>;
  formulaIndex?: number;
  formulaStore?: FormulaStore;
  controls?: IControls[];
  environment?: IEnvironment;
}

const Formula = observer(
  ({
    variableRanges = {},
    formulaIndex,
    formulaStore,
    controls,
    environment,
  }: FormulaProps = {}) => {
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
            const processedLatex = processLatexContent(latex);

            // Get font size from environment with fallback
            const fontSize = environment?.fontSize ?? 0.9;

            // Validate fontSize is between 0.5 and 1, with fallback to 0.9
            const validatedFontSize =
              typeof fontSize === "number" && fontSize >= 0.5 && fontSize <= 1
                ? fontSize
                : 0.9;
            const fontSizeValue = `${validatedFontSize}em`;

            return `
            <div class="formula-expression" data-expression-index="${index}">
              <div class="border border-slate-200 bg-white rounded-2xl py-0 px-4 w-fit text-[${fontSizeValue}]">\\[${processedLatex}\\]</div>
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
          dragHandler(element as HTMLElement, variableRanges);
          // Check if we're in step mode
          const isStepMode = environment?.computation?.mode === "step";
          if (isStepMode) {
            stepHandler(element as HTMLElement);
          } else {
            dropdownHandler(element as HTMLElement);
          }
        });
      } catch (error) {
        console.error("Error rendering formulas:", error);
      }
    }, [getFormula, variableRanges, environment]);

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
      <div className="flex flex-col gap-4">
        {/* Control Panel */}
        {controls && controls.length > 0 && (
          <ControlPanel controls={controls} />
        )}

        {/* Interactive Formula Display */}
        <div
          ref={containerRef}
          className="formulas-container flex flex-col gap-4"
        />
      </div>
    );
  }
);

export type { FormulaProps };
export default Formula;
