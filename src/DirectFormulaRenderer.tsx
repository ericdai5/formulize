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
  
  // Convert the config to a JavaScript-like format for display
  const configToJsString = (config: FormulizeConfig): string => {
    const computation = config.formula.computation;
    let computationStr = '';

    if (computation.engine === 'symbolic-algebra') {
      computationStr = `
    computation: {
      // Use symbolic algebra engine
      engine: "symbolic-algebra",
      formula: "${(computation as any).formula || '{K} = 0.5 * {m} * {v} * {v}'}"
    }`;
    } else {
      computationStr = `
    computation: {
      // Use LLM engine
      engine: "llm",
      model: "${(computation as any).model || 'gpt-4'}"
    }`;
    }

    return `// Formulize configuration
const config = {
  formula: {
    expression: "${config.formula.expression}",

    variables: {
      K: {
        type: "dependent",
        units: "J",
        label: "Kinetic Energy",
        precision: 2
      },
      m: {
        type: "input",
        value: ${config.formula.variables.m?.value || 1},
        range: [0.1, 10],
        units: "kg",
        label: "Mass"
      },
      v: {
        type: "input",
        value: ${config.formula.variables.v?.value || 2},
        range: [0.1, 100],
        units: "m/s",
        label: "Velocity"
      }
    },${computationStr}
  },

  visualizations: [
    {
      type: "plot2d",
      config: {
        title: "Kinetic Energy vs. Velocity",
        xAxis: {
          variable: "v",
          label: "Velocity (m/s)",
          min: 0,
          max: 20
        },
        yAxis: {
          variable: "K",
          label: "Kinetic Energy (J)",
          min: 0,
          max: 200
        },
        width: 800,
        height: 500
      }
    }
  ]
};

// Create the formula
const formula = await Formulize.create(config);`;
  };

  const [formulizeInput, setFormulizeInput] = useState<string>(
    configToJsString(initialConfig)
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

  // Update the formula display when the config changes
  useEffect(() => {
    if (formulizeConfig !== initialConfig) {
      setFormulizeInput(configToJsString(formulizeConfig));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formulizeConfig, JSON.stringify(formulizeConfig)]);

  const renderFormula = async () => {
    try {
      setError(null);

      // Extract the engine type and configuration from the textarea JavaScript
      let configToUse = { ...formulizeConfig };

      // Check if the textarea contains a symbolic-algebra engine definition
      if (formulizeInput.includes('engine: "symbolic-algebra"')) {
        configToUse = {
          ...configToUse,
          formula: {
            ...configToUse.formula,
            computation: {
              engine: "symbolic-algebra",
              formula: "{K} = 0.5 * {m} * {v} * {v}"
            }
          }
        };
      }
      // Check if the textarea contains an llm engine definition
      else if (formulizeInput.includes('engine: "llm"')) {
        configToUse = {
          ...configToUse,
          formula: {
            ...configToUse.formula,
            computation: {
              engine: "llm",
              model: "gpt-4"
            }
          }
        };
      }

      console.log("Using config with engine:", configToUse.formula.computation.engine);

      // Create the formula using Formulize API
      try {
        const formulizeInstance = await Formulize.create(configToUse);

        // Store the config globally for access by other components
        window.__lastFormulizeConfig = configToUse;

        // Notify parent of config change via callback if provided
        if (onConfigChange) {
          console.log("📢 Notifying parent of configuration:", configToUse);
          onConfigChange(configToUse);
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">
                Formulize Configuration (JavaScript):
              </label>
              <div className="text-sm text-gray-500">
                Edit this configuration to change the computation engine
              </div>
            </div>
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