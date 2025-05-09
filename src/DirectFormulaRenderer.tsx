import { useEffect, useRef, useState } from "react";

import BlockInteractivity from "./BlockInteractivity";
import { Formulize, FormulizeConfig, FormulizeFormula } from "./api";

interface DirectFormulaRendererProps {
  formulizeConfig?: FormulizeConfig;
  formulizeFormula?: FormulizeFormula;
  autoRender?: boolean;
  height?: number | string;
  width?: number | string;
  onConfigChange?: (config: FormulizeConfig) => void;
}

// Default Formulize formula configuration
const DEFAULT_FORMULIZE_FORMULA: FormulizeFormula = {
  expression: "K = \\frac{1}{2}mv^2",
  variables: {
    K: {
      type: "dependent",
      units: "J",
      label: "kinetic energy",
      precision: 2,
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
  },
};

const DirectFormulaRenderer = ({
  formulizeConfig = { formula: DEFAULT_FORMULIZE_FORMULA },
  formulizeFormula = DEFAULT_FORMULIZE_FORMULA,
  autoRender = true,
  height = 300,
  width = "100%",
  onConfigChange,
}: DirectFormulaRendererProps) => {
  // Use formulizeConfig if provided, otherwise use the formulizeFormula
  const initialConfig = formulizeConfig?.formula ? 
    formulizeConfig : 
    { formula: formulizeFormula };
  
  const [formulizeInput, setFormulizeInput] = useState<string>(
    JSON.stringify(initialConfig, null, 2)
  );
  const [isRendered, setIsRendered] = useState<boolean>(autoRender);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoRender) {
      renderFormula();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderFormula = async () => {
    try {
      setError(null);
      
      // Parse the Formulize configuration
      let parsedFormulize;
      try {
        parsedFormulize = JSON.parse(formulizeInput);
      } catch (e) {
        setError("Invalid JSON in Formulize configuration");
        return;
      }

      // Create the formula using Formulize API
      try {
        const formulizeInstance = await Formulize.create(parsedFormulize);

        // Store the config globally for access by other components
        window.__lastFormulizeConfig = parsedFormulize;

        // Notify parent of config change via callback if provided
        if (onConfigChange) {
          console.log("📢 Notifying parent of configuration:", parsedFormulize);
          onConfigChange(parsedFormulize);
        }

        setIsRendered(true);
      } catch (e) {
        console.error("Formulize API error:", e);
        setError(`Failed to create formula: ${e instanceof Error ? e.message : String(e)}`);
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
          <h2 className="text-lg font-semibold mb-4">Formulize Definition</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Formulize Configuration (JSON):
            </label>
            <textarea
              value={formulizeInput}
              onChange={(e) => setFormulizeInput(e.target.value)}
              className="w-full p-2 border rounded font-mono text-sm h-80"
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
            Drag input variables to see how they affect the dependent variables
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectFormulaRenderer;