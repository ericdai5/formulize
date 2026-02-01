import { useCallback, useEffect, useRef, useState } from "react";

import { reaction, toJS } from "mobx";
import { observer } from "mobx-react-lite";

import { GripVertical } from "lucide-react";

import { useFormulize } from "../../core/hooks";
import { debugStore } from "../../store/debug";
import {
  FormulaNodeData,
  renderFormulaWithMathJax,
} from "../../util/canvas/formula-node";
import { buildDebugStyles } from "../../util/debug-styles";

// Custom Formula Node Component
const FormulaNode = observer(({ data }: { data: FormulaNodeData }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const context = useFormulize();
  const computationStore = context?.computationStore;
  const executionStore = context?.executionStore;

  // All hooks must be called before any conditional returns
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
    // Pass stores from context to the render function (convert null to undefined)
    const dataWithStores: FormulaNodeData = {
      ...data,
      computationStore: computationStore ?? undefined,
      executionStore: executionStore ?? undefined,
    };
    await renderFormulaWithMathJax(
      nodeRef.current,
      dataWithStores,
      isInitialized
    );
  }, [data, computationStore, executionStore, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      renderFormula();
    }
  }, [isInitialized, renderFormula]);

  useEffect(() => {
    if (!computationStore || !executionStore) return;
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
        // Serialize activeVariables Map for change detection
        activeVariables: Array.from(
          executionStore.activeVariables.entries()
        ).map(([formulaId, varSet]) => [formulaId, Array.from(varSet)]),
      }),
      () => {
        if (isInitialized) {
          renderFormula();
        }
      }
    );
    return () => disposer();
  }, [computationStore, executionStore, isInitialized, renderFormula]);

  // React to hover state changes and update DOM directly
  useEffect(() => {
    if (!computationStore) return;
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
  }, [computationStore, data.id]);

  // All conditional returns must happen after all hooks are called
  if (!computationStore || !executionStore) return null;

  const customStyle = computationStore.environment?.formulaNodeStyle
    ? toJS(computationStore.environment.formulaNodeStyle)
    : {};

  // Default to showing drag handle unless explicitly set to false
  const showDragHandle = data.showDragHandle !== false;

  // Build debug styles that override customStyle when enabled
  const debugStyles = buildDebugStyles(
    debugStore.showFormulaBorders,
    debugStore.showFormulaShadow
  );

  return (
    <div
      ref={nodeRef}
      className="formula-node relative p-2.5 group"
      style={{ ...customStyle, ...debugStyles }}
    >
      {/* Left Handle - only show if showDragHandle is true */}
      {showDragHandle && (
        <div className="formula-drag-handle absolute top-1/2 -left-4 transform -translate-y-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-0.5 py-1 cursor-move z-20 opacity-0 group-hover:opacity-100">
          <GripVertical size={14} className="text-slate-400" />
        </div>
      )}
      {/* Formula content container */}
      <div className="formula">
        <div className="rendered-latex"></div>
      </div>
    </div>
  );
});

export default FormulaNode;
