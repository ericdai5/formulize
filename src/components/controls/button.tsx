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
          // Create value accessor with just the values (same as manual engine)
          const vars: Record<string, any> = {};
          computationStore.variables.forEach((variable, key) => {
            if (variable && variable.value !== undefined) {
              vars[key] = variable.value;
            }
          });

          // Execute the function
          code(vars);

          // Sync back all modified variables
          for (const [key, value] of Object.entries(vars)) {
            const variable = computationStore.variables.get(key);
            if (variable && (Array.isArray(value) || typeof value === 'number')) {
              variable.value = value;
            }
          }

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
