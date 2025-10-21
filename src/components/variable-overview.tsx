import { observer } from "mobx-react-lite";

import { computationStore } from "../store/computation";

interface StorePaneProps {
  className?: string;
}

const StorePane = observer(({ className = "" }: StorePaneProps) => {
  const getVariableData = () => {
    const formulas = computationStore.displayedFormulas;
    const computationFunctions = computationStore.symbolicFunctions;

    return {
      variables: Array.from(computationStore.variables.entries()).map(
        ([id, variable]) => ({
          id,
          symbol: id,
          type: variable.type,
          dataType: variable.dataType,
          value: variable.dataType === "set" ? variable.setValue : variable.value,
        })
      ),
      formulas: formulas.map((latex, index) => ({
        index,
        latex,
        expression: computationFunctions[index] || "N/A",
      })),
    };
  };

  const variableData = getVariableData();

  return (
    <div className={`overflow-hidden ${className} space-y-3 p-3`}>
      {variableData.variables.length === 0 ? (
        <p className="text-gray-500 italic">
          No variables found in computation store
        </p>
      ) : (
        variableData.variables.map((variable) => {
          const fields = [
            { label: "ID", value: variable.id },
            { label: "Symbol", value: variable.symbol },
            { label: "Type", value: variable.type },
            { label: "Data Type", value: variable.dataType || "scalar" },
            { 
              label: "Value", 
              value: variable.dataType === "set" 
                ? (Array.isArray(variable.value) ? `[${variable.value.join(", ")}]` : "[]")
                : variable.value 
            },
          ];

          return (
            <div
              key={variable.id}
              className="border border-gray-200 rounded-lg p-3"
            >
              <div className="grid grid-cols-2 gap-2 text-sm">
                {fields.map((field, index) => (
                  <div key={index}>
                    {field.label}: {field.value}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* LaTeX Formulas Section */}
      {variableData.formulas.length > 0 && (
        <>
          <div className="mt-6 mb-4 text-lg">LaTeX Formulas</div>
          <div className="space-y-3">
            {variableData.formulas.map((formula) => (
              <div
                key={formula.index}
                className="border border-gray-200 rounded-lg p-3"
              >
                <div className="space-y-2 text-sm">
                  <div>Formula {formula.index + 1}:</div>
                  <div className="bg-gray-50 p-2 rounded font-mono text-xs overflow-x-auto">
                    LaTeX: {formula.latex}
                  </div>
                  <div className="bg-gray-50 p-2 rounded font-mono text-xs overflow-x-auto">
                    Expression: {formula.expression}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 pt-4 border-t">
        <p className="text-sm text-gray-600">
          Total variables: {variableData.variables.length}
        </p>
        {variableData.formulas.length > 0 && (
          <p className="text-sm text-gray-600">
            Total formulas: {variableData.formulas.length}
          </p>
        )}
      </div>
    </div>
  );
});

export default StorePane;
