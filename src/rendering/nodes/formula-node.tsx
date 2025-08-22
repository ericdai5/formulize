import { useCallback, useEffect, useRef, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { GripHorizontal, GripVertical } from "lucide-react";

import { processLatexContent } from "../../parse/variable";
import { computationStore } from "../../store/computation";
import { dragHandler } from "../interaction/drag-handler";
import { dropdownHandler } from "../interaction/dropdown-handler";
import { stepHandler } from "../interaction/step-handler";

// Custom Formula Node Component
const FormulaNode = observer(({ data }: { data: any }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
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
  }, []);

  const renderFormula = useCallback(async () => {
    if (!nodeRef.current || !isInitialized) return;
    const container = nodeRef.current;
    const { latex, environment } = data;

    try {
      // Find the formula content container
      const formulaContainer = container.querySelector(
        ".formula-content-container"
      ) as HTMLElement;
      if (!formulaContainer) {
        console.warn("Formula content container not found");
        return;
      }

      // Clear previous MathJax content from formula container only
      window.MathJax.typesetClear([formulaContainer]);

      // Process the LaTeX to include interactive elements
      let processedLatex;
      try {
        processedLatex = processLatexContent(latex);
      } catch (latexError) {
        console.error("Error processing LaTeX content:", latexError);
        processedLatex = latex; // Fallback to original latex
      }

      const fontSize = environment?.fontSize;

      const formulaHTML = `
        <div class="formula-expression" data-expression-index="0">
          <div class="border border-slate-200 bg-white rounded-2xl px-6 w-fit" style="font-size: ${fontSize}em">\\[${processedLatex}\\]</div>
        </div>
      `;

      formulaContainer.innerHTML = formulaHTML;
      await window.MathJax.typesetPromise([formulaContainer]);

      if (!nodeRef.current) {
        console.warn("Container ref became null during async operations");
        return;
      }

      // Set up interaction handlers
      const expressionElement = formulaContainer.querySelector(
        ".formula-expression"
      );
      if (expressionElement) {
        dragHandler(expressionElement as HTMLElement);
        const isStepMode = environment?.computation?.mode === "step";
        if (isStepMode) {
          stepHandler(expressionElement as HTMLElement);
        } else {
          dropdownHandler(expressionElement as HTMLElement);
        }
      }
    } catch (error) {
      console.error("Error rendering formula:", error);
    }
  }, [data, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      renderFormula();
    }
  }, [isInitialized, renderFormula]);

  useEffect(() => {
    const disposer = reaction(
      () => ({
        variables: Array.from(computationStore.variables.entries()).map(
          ([id, v]) => ({
            id,
            type: v.type,
            value: v.value,
            hover: v.hover,
          })
        ),
        variableTypesChanged: computationStore.variableTypesChanged,
      }),
      () => {
        if (isInitialized) {
          renderFormula();
        }
      }
    );
    return () => disposer();
  }, [isInitialized, renderFormula]);

  return (
    <div
      ref={nodeRef}
      className="formula-node min-w-[200px] relative p-2.5 group"
    >
      {/* Top Handle */}
      <div className="formula-drag-handle absolute -top-0 left-1/2 transform -translate-x-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-1 py-0.5 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripHorizontal size={14} className="text-slate-400" />
      </div>
      {/* Bottom Handle */}
      <div className="formula-drag-handle absolute -bottom-0 left-1/2 transform -translate-x-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-1 py-0.5 cursor-move z-20  opacity-0 group-hover:opacity-100">
        <GripHorizontal size={14} className="text-slate-400" />
      </div>
      {/* Left Handle */}
      <div className="formula-drag-handle absolute top-1/2 -left-0 transform -translate-y-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-0.5 py-1 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripVertical size={14} className="text-slate-400" />
      </div>
      {/* Right Handle */}
      <div className="formula-drag-handle absolute top-1/2 -right-0 transform -translate-y-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-0.5 py-1 cursor-move z-20  opacity-0 group-hover:opacity-100">
        <GripVertical size={14} className="text-slate-400" />
      </div>
      {/* Formula content container */}
      <div className="formula-content-container"></div>
    </div>
  );
});

export default FormulaNode;
