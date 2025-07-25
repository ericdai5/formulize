import { useCallback, useMemo } from "react";

import { observer } from "mobx-react-lite";

import { executionStore as ctx } from "../../api/execution";
import { computationStore } from "../../store/computation";
import { IArrayControl } from "../../types/control";
import { getVariable } from "../../util/computation-helpers.ts";
import LatexLabel from "../latex";

interface ArrayProps {
  control: IArrayControl;
}

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

  // Get array values from the variable's set property or from memberOf parent
  const getArrayValues = useCallback(() => {
    if (variable) {
      // If variable has memberOf, get values from parent variable
      if (variable.memberOf) {
        // Prevent circular references by checking if parent points back to this variable
        if (variable.memberOf === variableId) {
          console.warn(
            `Circular memberOf reference detected for variable ${variableId}`
          );
          return variable.set || [];
        }
        const parentVariable = computationStore.variables.get(
          variable.memberOf
        );
        if (parentVariable?.set) {
          return parentVariable.set;
        }
      }
      // Otherwise, get values from the variable's own set property
      if (variable.set) {
        return variable.set;
      }
    }
    return [];
  }, [variable]);

  const arrayValues = getArrayValues();

  const handleValueClick = useCallback(
    (clickedValue: any, index: number) => {
      if (variableId) {
        // If there's a stepToIndex callback available (debug mode), use it
        if (computationStore.stepToIndexCallback) {
          const processedIndices =
            computationStore.processedIndices.get(variableId) || new Set();

          // If this index is already processed, refresh and restart
          if (processedIndices.has(index)) {
            if (computationStore.refreshCallback) {
              computationStore.refreshCallback();
              // Use setTimeout to ensure refresh completes before stepping to index
              setTimeout(() => {
                if (computationStore.stepToIndexCallback) {
                  computationStore.stepToIndexCallback(variableId, index);
                }
              }, 0);
            }
          } else {
            // Otherwise, just step to the index normally
            computationStore.stepToIndexCallback(variableId, index);
          }
        } else {
          // Otherwise, just set the value normally
          computationStore.setValue(variableId, clickedValue);
        }
      }
    },
    [variableId]
  );

  // Get active index directly for MobX reactivity
  const getActiveIndex = () => {
    if (!variableId) {
      return null;
    }

    // Check if there's an active index from views
    const viewActiveIndex = computationStore.activeIndices.get(variableId);
    if (viewActiveIndex !== undefined) {
      return viewActiveIndex;
    }

    // Check if there's a target index from stepToIndex (block mode)
    if (ctx.targetIndex) {
      return ctx.targetIndex.index;
    }
    return null;
  };

  // Get processed indices for styling
  const getProcessedIndices = () => {
    if (variableId) {
      return computationStore.processedIndices.get(variableId) || new Set();
    }
    return new Set();
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
                onClick={() => handleValueClick(value, index)}
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

export default Array;
