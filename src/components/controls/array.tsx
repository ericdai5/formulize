import { useCallback, useEffect, useMemo, useRef } from "react";

import { observer } from "mobx-react-lite";

import { computationStore } from "../../api/computation";
import { IArrayControl } from "../../types/control";
import { getVariable } from "../../util/computation-helpers";

interface ArrayProps {
  control: IArrayControl;
}

const LatexLabel = ({ latex }: { latex: string }) => {
  const labelRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const renderLatex = async () => {
      if (!labelRef.current || !window.MathJax) return;
      try {
        await window.MathJax.startup.promise;
        labelRef.current.innerHTML = `\\(${latex}\\)`;
        await window.MathJax.typesetPromise([labelRef.current]);
      } catch (error) {
        console.error("Error rendering LaTeX label:", error);
        // Fallback to plain text
        labelRef.current.textContent = latex;
      }
    };
    renderLatex();
  }, [latex]);

  return (
    <span
      ref={labelRef}
      className="flex items-center justify-center"
      style={{ fontSize: "0.6rem" }}
    >
      {latex}
    </span>
  );
};

const Array = observer(({ control }: ArrayProps) => {
  // Get the variable ID from the control's variable property
  const getVariableId = useCallback(() => {
    if (control.variable) {
      return control.variable;
    }
    return null;
  }, [control.variable]);

  const variableId = getVariableId();
  const variable = useMemo(
    () => (variableId ? getVariable(variableId) : null),
    [variableId]
  );

  // Get array values from the variable's set property
  const getArrayValues = useCallback(() => {
    if (variable && variable.set) {
      return variable.set;
    }
    return [];
  }, [variable]);

  const arrayValues = getArrayValues();

  const handleValueClick = useCallback(
    (clickedValue: any) => {
      if (variableId) {
        // If there's a stepToValue callback available (debug mode), use it
        if (computationStore.stepToValueCallback) {
          computationStore.stepToValueCallback(variableId, clickedValue);
        } else {
          // Otherwise, just set the value normally
          computationStore.setValue(variableId, clickedValue);
        }
      }
    },
    [variableId]
  );

  // Get active value directly for MobX reactivity
  const getActiveValue = () => {
    if (variableId) {
      return computationStore.activeValues.get(variableId);
    }
    return null;
  };

  const formatValue = useCallback((value: any) => {
    return String(value);
  }, []);

  const isVertical = control.orientation === "vertical";

  return (
    <div
      className={`array-control ${
        isVertical ? "flex-col max-h-64 w-fit" : "flex-row max-w-64 h-fit"
      } flex bg-white border border-slate-200 rounded-2xl overflow-hidden`}
    >
      {variableId && (
        <label
          className={`text-base font-medium p-2.5
          } text-slate-700 flex items-center justify-center
          }`}
        >
          <LatexLabel latex={variableId} />
        </label>
      )}

      <div
        className={`${
          isVertical
            ? "flex flex-col gap-1 overflow-y-auto px-2 border-t border-slate-200 scrollbar-hide"
            : "flex flex-row gap-1 overflow-x-auto py-2 border-l border-slate-200 scrollbar-hide"
        }`}
      >
        {arrayValues.length === 0 ? (
          <div className="text-sm text-slate-400 italic">Empty array</div>
        ) : (
          arrayValues.map((value, index) => {
            const activeValue = getActiveValue();
            const isActive = activeValue !== null && activeValue === value;
            return (
              <div
                key={index}
                onClick={() => handleValueClick(value)}
                className={`
                  px-3 py-1 text-sm border rounded-xl
                  cursor-pointer transition-colors duration-150
                  ${isVertical ? "w-full text-center" : "whitespace-nowrap"}
                  ${
                    isActive
                      ? "bg-green-100 border-green-400 text-green-800 ring-1 ring-green-300"
                      : "border-slate-200 hover:bg-slate-200 hover:border-slate-300"
                  }
                `}
              >
                {formatValue(value)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default Array;
