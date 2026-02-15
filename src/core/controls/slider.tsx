import React, { useCallback, useMemo } from "react";

import { observer } from "mobx-react-lite";

import { ISliderControl } from "../../types/control";
import { INPUT_VARIABLE_DEFAULT } from "../../types/variable";
import { useStore } from "../hooks";

interface SliderProps {
  control: ISliderControl;
}

const Slider = observer(({ control }: SliderProps) => {
  const context = useStore();
  const computationStore = context?.computationStore;

  // Guard: computationStore must be available
  if (!computationStore) {
    return <div className="text-red-500">No computation store available</div>;
  }

  // Get the variable ID from the control's variable property
  const getVariableId = useCallback(() => {
    if (control.variable) {
      return control.variable;
    }
    return null;
  }, [control.variable]);

  const variableId = getVariableId();
  const variable = useMemo(
    () => (variableId ? computationStore.variables.get(variableId) : null),
    [variableId, computationStore]
  );

  // Get min, max, step from variable definition
  const getSliderConfig = useCallback(() => {
    if (variable && variable.range) {
      const [min, max] = variable.range;
      const step = variable.step || 0.1;
      return { min, max, step };
    }
    // Fallback defaults if no variable or range defined
    return { min: -10, max: 10, step: 0.1 };
  }, [variable]);

  const { min, max, step } = getSliderConfig();

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(event.target.value);

      if (variableId) {
        computationStore.setValue(variableId, newValue);
      }
    },
    [variableId]
  );

  const formatValue = useCallback(
    (value: number) => {
      const precision = variable?.precision ?? INPUT_VARIABLE_DEFAULT.PRECISION;
      return value.toFixed(precision);
    },
    [variable?.precision, step]
  );

  const isVertical = control.orientation === "vertical";
  const currentValue =
    typeof variable?.value === "number" ? variable.value : (min + max) / 2;

  return (
    <div
      className={`slider-control ${isVertical ? "flex-col h-64 w-20" : "flex-col w-64"} flex items-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl`}
    >
      {variable?.name && (
        <label
          className={`text-base text-center ${isVertical ? "mb-2" : "mr-2"}`}
        >
          {variable.name}
        </label>
      )}

      <div
        className={`${isVertical ? "flex-1 flex flex-col items-center justify-start relative w-full" : "flex-1"}`}
      >
        {isVertical ? (
          <>
            <div className="flex-1 flex items-center justify-center relative w-full">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={currentValue}
                onChange={handleChange}
                className="
                  nodrag
                  h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:w-4 
                  [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-blue-600 
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:hover:bg-blue-700
                  [&::-webkit-slider-thumb]:active:bg-blue-800
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-blue-600
                  [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:shadow-md
                  [&::-moz-range-track]:h-2
                  [&::-moz-range-track]:bg-slate-200
                  [&::-moz-range-track]:rounded-lg
                "
                style={{
                  width: "150px",
                  height: "8px",
                  transform: "rotate(-90deg)",
                  transformOrigin: "center",
                }}
              />
            </div>
            {(control.showValue ?? true) && (
              <div className="text-sm text-slate-600 font-mono">
                {formatValue(currentValue)}
              </div>
            )}
          </>
        ) : (
          <>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={currentValue}
              onChange={handleChange}
              className="
                nodrag
                w-full 
                h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:w-4 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:bg-blue-600 
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:hover:bg-blue-700
                [&::-webkit-slider-thumb]:active:bg-blue-800
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-blue-600
                [&::-moz-range-thumb]:cursor-pointer
                [&::-moz-range-thumb]:shadow-md
                [&::-moz-range-track]:h-2
                [&::-moz-range-track]:bg-slate-200
                [&::-moz-range-track]:rounded-lg
              "
            />
            {(control.showValue ?? true) && (
              <div className="text-sm text-slate-600 font-mono ml-2">
                {formatValue(currentValue)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default Slider;
