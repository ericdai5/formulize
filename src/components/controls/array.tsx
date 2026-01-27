import { useCallback, useMemo } from "react";

import { observer } from "mobx-react-lite";

import { IArrayControl } from "../../types/control";
import LatexLabel from "../latex";
import { useFormulize } from "../useFormulize";

interface ArrayProps {
  control: IArrayControl;
}

const ArrayControl = observer(({ control }: ArrayProps) => {
  const context = useFormulize();
  const computationStore = context?.computationStore;
  const executionStore = context?.executionStore;

  // Get the variable ID from the control's variable property
  const getVariableId = useCallback(() => {
    if (control.variable) {
      return control.variable;
    }
    return null;
  }, [control.variable]);

  const variableId = getVariableId();
  const variable = useMemo(
    () =>
      variableId && computationStore
        ? computationStore.variables.get(variableId)
        : null,
    [variableId, computationStore]
  );

  // Get array values from the variable's value property
  const getArrayValues = useCallback(() => {
    if (!computationStore) return [];
    if (variable) {
      if (Array.isArray(variable.value)) {
        return variable.value;
      }
    }
    return [];
  }, [variable, computationStore]);

  const arrayValues = getArrayValues();

  // Get active index directly for MobX reactivity
  const getActiveIndex = () => {
    if (!variableId || !computationStore || !executionStore) {
      return null;
    }

    // Check if there's an active index from views
    const viewActiveIndex = computationStore.activeIndices.get(variableId);
    if (viewActiveIndex !== undefined) {
      return viewActiveIndex;
    }

    // Check if there's a target index from stepToIndex (block mode)
    if (executionStore.targetIndex) {
      return executionStore.targetIndex.index;
    }
    return null;
  };

  // Get processed indices for styling
  const getProcessedIndices = () => {
    if (variableId && computationStore) {
      return computationStore.processedIndices.get(variableId) || new Set();
    }
    return new Set();
  };

  const formatValue = useCallback((value: any) => {
    return String(value);
  }, []);

  const isVertical = control.orientation === "vertical";

  // Guard: stores must be available - placed after all hooks
  if (!computationStore || !executionStore) {
    return <div className="text-red-500">No stores available</div>;
  }

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
        className={`nodrag ${
          isVertical
            ? "flex flex-col gap-1 overflow-y-auto px-2 border-t border-slate-200 scrollbar-hide"
            : "flex flex-row gap-1 overflow-x-auto py-2 border-l border-slate-200 scrollbar-hide"
        }`}
      >
        {arrayValues.length === 0 ? (
          <div className="text-sm text-slate-400 italic">Empty array</div>
        ) : (
          arrayValues.map((value, index) => {
            const activeIndex = getActiveIndex();
            const processedIndices = getProcessedIndices();
            const isActive = activeIndex !== null && activeIndex === index;
            const isProcessed = processedIndices.has(index);
            return (
              <div
                key={index}
                // onClick={() => handleValueClick(value, index)}
                className={`
                  px-3 py-1 text-sm border rounded-xl
                  cursor-pointer transition-colors duration-150
                  ${isVertical ? "w-full text-center" : "whitespace-nowrap"}
                  ${
                    isActive
                      ? "bg-green-100 border-green-400 text-green-800 ring-1 ring-green-300"
                      : isProcessed
                        ? "bg-slate-100 border-slate-200 hover:bg-slate-200 hover:border-slate-400 hover:ring-1 hover:ring-slate-200"
                        : "border-slate-200 hover:bg-slate-200 hover hover:border-slate-400 hover:ring-1 hover:ring-slate-200"
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

ArrayControl.displayName = "ArrayControl";

export default ArrayControl;
