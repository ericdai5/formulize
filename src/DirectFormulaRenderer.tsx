import { useEffect, useRef, useState } from "react";

import BlockInteractivity from "./BlockInteractivity";
import { FormulaDefinition, createFormula } from "./api/formulaAPI";

interface DirectFormulaRendererProps {
  formula?: string;
  variables?: Record<string, any>;
  autoRender?: boolean;
  height?: number | string;
  width?: number | string;
}

const DEFAULT_FORMULA = "K = \\frac{1}{2}mv^2";
const DEFAULT_VARIABLES = {
  K: {
    type: "output",
    units: "J",
    label: "kinetic energy",
    round: 2,
  },
  m: {
    type: "constant",
    value: 1,
    units: "kg",
    label: "mass",
  },
  v: {
    type: "input",
    value: 2,
    range: [0.1, 10],
    units: "m/s",
    label: "velocity",
  },
};

const DirectFormulaRenderer = ({
  formula = DEFAULT_FORMULA,
  variables = DEFAULT_VARIABLES,
  autoRender = true,
  height = 300,
  width = "100%",
}: DirectFormulaRendererProps) => {
  const [formulaInput, setFormulaInput] = useState<string>(formula);
  const [variablesInput, setVariablesInput] = useState<string>(
    JSON.stringify(variables, null, 2)
  );
  const [isRendered, setIsRendered] = useState<boolean>(autoRender);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoRender) {
      renderFormula();
    }
  }, []);

  const renderFormula = async () => {
    try {
      setError(null);

      let parsedVariables;
      try {
        parsedVariables = JSON.parse(variablesInput);
      } catch (e) {
        setError("Invalid JSON in variables");
        return;
      }

      const definition: FormulaDefinition = {
        formula: formulaInput,
        variables: parsedVariables,
      };

      const success = await createFormula(definition);

      if (success) {
        setIsRendered(true);
      } else {
        setError("Failed to create formula");
      }
    } catch (err) {
      console.error("Error rendering formula:", err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="formula-renderer border border-gray-200 rounded-lg overflow-hidden">
      {!isRendered ? (
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Formula Definition</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              LaTeX Formula:
            </label>
            <input
              type="text"
              value={formulaInput}
              onChange={(e) => setFormulaInput(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Variables (JSON):
            </label>
            <textarea
              value={variablesInput}
              onChange={(e) => setVariablesInput(e.target.value)}
              className="w-full p-2 border rounded font-mono text-sm h-40"
            />
          </div>

          <button
            onClick={renderFormula}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Render Formula
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center justify-between bg-gray-100 px-4 py-2">
            <h3 className="font-medium">Interactive Formula</h3>
            <button
              onClick={() => setIsRendered(false)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>

          <div
            ref={containerRef}
            style={{ height, width }}
            className="interactive-formula-container"
          >
            <BlockInteractivity />
          </div>

          <div className="p-2 bg-gray-50 text-xs text-gray-500">
            Drag sliding variables (blue) to see how they affect the output
            (gray)
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectFormulaRenderer;
