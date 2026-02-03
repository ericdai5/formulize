import { observer } from "mobx-react-lite";

import { IRadioControl } from "../../types/control";
import Latex from "../../internal/latex";
import { useFormulize } from "../hooks";

interface RadioControlProps {
  control: IRadioControl;
}

export const RadioControl = observer<RadioControlProps>(({ control }) => {
  const context = useFormulize();
  const computationStore = context?.computationStore;

  // Guard: computationStore must be available
  if (!computationStore) {
    return <div className="text-red-500">No computation store available</div>;
  }
  const { variable, orientation = "vertical" } = control;

  const variableData = computationStore.variables.get(variable || "");
  const currentValue = variableData?.value;

  // Generate options from variable's range and step
  const generateOptions = () => {
    if (!variableData?.range) return [];

    const [min, max] = variableData.range;
    const step = variableData.step || 1;
    const precision = variableData.precision;

    const options = [];
    for (let value = min; value <= max; value += step) {
      const formattedValue = value.toFixed(precision);
      options.push({
        value: formattedValue,
        label: formattedValue,
      });
    }
    return options;
  };

  const options = generateOptions();

  const handleChange = (value: string) => {
    if (variable) {
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        computationStore.setValue(variable, numericValue);
      }
    }
  };

  const containerClass =
    orientation === "vertical" ? "flex flex-col gap-2" : "flex flex-wrap gap-3";

  return (
    <div>
      {variable && (
        <div className="mb-3">
          <Latex latex={variable} />
        </div>
      )}
      <div className={containerClass}>
        {options.map((option) => {
          const optionValue = parseFloat(option.value);
          const isSelected = currentValue === optionValue;

          return (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                name={`radio-${variable}`}
                value={option.value}
                checked={isSelected}
                onChange={() => handleChange(option.value)}
                className="nodrag w-4 h-4"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
});

export default RadioControl;
