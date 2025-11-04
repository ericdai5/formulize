import { observer } from "mobx-react-lite";

import { computationStore } from "../../store/computation";
import { ICheckboxControl } from "../../types/control";
import Latex from "../latex";

interface CheckboxControlProps {
  control: ICheckboxControl;
}

export const CheckboxControl = observer<CheckboxControlProps>(({ control }) => {
  const { variable, availableElements, orientation = "horizontal" } = control;

  const variableData = computationStore.variables.get(variable || "");
  const selected =
    variableData?.dataType === "set" ? variableData?.set || [] : [];

  const toggle = (element: string) => {
    if (variable) {
      const newSelection = selected.includes(element)
        ? selected.filter((e) => e !== element)
        : [...selected, element];
      computationStore.setSetValue(variable, newSelection);
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
        {availableElements.map((element) => (
          <label
            key={element}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(element)}
              onChange={() => toggle(element)}
              className="nodrag w-4 h-4"
            />
            <span className="text-sm">{element}</span>
          </label>
        ))}
      </div>
    </div>
  );
});

export default CheckboxControl;
