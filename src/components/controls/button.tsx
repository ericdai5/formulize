import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";

import { computationStore } from "../../store/computation";
import { IButtonControl } from "../../types/control";
import Latex from "../latex";

interface ButtonControlProps {
  control: IButtonControl;
}

export const ButtonControl = observer<ButtonControlProps>(({ control }) => {
  const { variable, code, label } = control;

  const handleClick = () => {
    if (code) {
      try {
        // Execute code in a MobX action for proper reactivity
        runInAction(() => {
          // Convert computationStore.variables Map to plain object (same as manual engine)
          const variablesObj: Record<string, any> = {};
          computationStore.variables.forEach((value, key) => {
            variablesObj[key] = value;
          });

          // Execute the function directly
          code(variablesObj);

          // Trigger recomputation of dependent variables
          computationStore.updateAllDependentVars();
        });
      } catch (error) {
        console.error('Error executing button code:', error);
      }
    }
  };

  return (
    <div>
      {variable && (
        <div className="mb-3">
          <Latex latex={variable} />
        </div>
      )}
      <button
        onClick={handleClick}
        className="nodrag px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
      >
        {label || "Click"}
      </button>
    </div>
  );
});

export default ButtonControl;
