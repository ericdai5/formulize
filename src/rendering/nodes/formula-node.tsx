import { useCallback, useEffect, useRef, useState } from "react";

import { reaction, toJS } from "mobx";
import { observer } from "mobx-react-lite";

import { GripVertical } from "lucide-react";

import { computationStore } from "../../store/computation";
import { executionStore } from "../../store/execution";
import {
  FormulaNodeData,
  renderFormulaWithMathJax,
} from "../util/formula-node";

// Custom Formula Node Component
const FormulaNode = observer(({ data }: { data: FormulaNodeData }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const showHoverOutlines = computationStore.showHoverOutlines;
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
    await renderFormulaWithMathJax(nodeRef.current, data, isInitialized);
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
            role: v.role,
            value: v.value,
          })
        ),
        variableRolesChanged: computationStore.variableRolesChanged,
        // Re-render when active variables change (for index variable display)
        activeVariables: Array.from(executionStore.activeVariables),
      }),
      () => {
        if (isInitialized) {
          renderFormula();
        }
      }
    );
    return () => disposer();
  }, [isInitialized, renderFormula]);

  // React to hover state changes and update DOM directly
  useEffect(() => {
    const disposer = reaction(
      () => Array.from(computationStore.hoverStates.entries()),
      (hoverStates) => {
        if (!nodeRef.current) return;
        hoverStates.forEach(([varId, isHovered]) => {
          const elements = nodeRef.current!.querySelectorAll(
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

  const handleFormulaMouseEnter = useCallback(() => {
    if (!nodeRef.current) return;
    const formulaExpression = nodeRef.current.querySelector(".formula");
    if (formulaExpression && showHoverOutlines) {
      formulaExpression.classList.add("hovered");
    }
  }, [showHoverOutlines]);

  const handleFormulaMouseLeave = useCallback(() => {
    if (!nodeRef.current) return;
    const formulaExpression = nodeRef.current.querySelector(".formula");
    if (formulaExpression) {
      formulaExpression.classList.remove("hovered");
    }
  }, []);

  const customStyle = computationStore.environment?.formulaNodeStyle
    ? toJS(computationStore.environment.formulaNodeStyle)
    : {};

  return (
    <div
      ref={nodeRef}
      className="formula-node relative p-2.5 group"
      data-show-hover-outlines={showHoverOutlines}
      style={customStyle}
      onMouseEnter={handleFormulaMouseEnter}
      onMouseLeave={handleFormulaMouseLeave}
    >
      {/* Left Handle */}
      <div className="formula-drag-handle absolute top-1/2 -left-4 transform -translate-y-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-0.5 py-1 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripVertical size={14} className="text-slate-400" />
      </div>
      {/* Formula content container */}
      <div className="formula">
        <div className="rendered-latex"></div>
      </div>
    </div>
  );
});

export default FormulaNode;
