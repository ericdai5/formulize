import { useEffect, useRef, useState } from "react";

import BlockInteractivity from "./BlockInteractivity";
import { Formulize, FormulizeConfig } from "./api";
import gravitationalPotential from "./examples/gravitationalPotential.ts";
import kineticEnergy from "./examples/kineticEnergy.ts";
import quadraticEquation from "./examples/quadraticEquation.ts";
import { IFormula } from "./types/formula";

interface DirectFormulaRendererProps {
  formulizeConfig?: FormulizeConfig;
  formulizeFormula?: IFormula;
  autoRender?: boolean;
  height?: number | string;
  width?: number | string;
  onConfigChange?: (config: FormulizeConfig) => void;
}

// Default Formulize formula configuration
const DEFAULT_FORMULIZE_FORMULA: IFormula = {
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
  const initialConfig = formulizeConfig?.formula
    ? formulizeConfig
    : { formula: formulizeFormula };

  // Convert the config to a JavaScript format for display
  // Use the kineticEnergy template as the default template
  const configToJsString = (config: FormulizeConfig): string => {
    return kineticEnergy;
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

  // Execute user-provided JavaScript code to get configuration
  const executeUserCode = async (
    jsCode: string
  ): Promise<FormulizeConfig | null> => {
    try {
      // Prepare a secure environment for executing the code
      // In a real production environment, we would use a more secure approach
      // like sandboxed iframes or a server-side evaluation

      // Create a function that will wrap the code and return the config
      const wrappedCode = `
        // Mock the Formulize API calls so we can capture the config
        let capturedConfig = null;
        
        const Formulize = {
          create: async function(config) {
            // Make a deep copy to prevent any reference issues
            capturedConfig = JSON.parse(JSON.stringify(config));
            
            // Log the captured config for debugging
            console.log("Captured config:", capturedConfig);
            
            // Return a mock instance
            return {
              formula: config.formula,
              getVariable: () => ({}),
              setVariable: () => true,
              update: async () => {},
              destroy: () => {}
            };
          }
        };
        
        // Add global context for variables the code might use
        const console = window.console;
        const Math = window.Math;
        
        // Execute the user's code
        try {
          ${jsCode}
        } catch(e) {
          console.error("Error in user code:", e);
          throw e; // Re-throw to propagate error
        }
        
        if (!capturedConfig) {
          throw new Error("No configuration was captured. Make sure your code calls Formulize.create(config)");
        }
        
        // Return the captured config
        return capturedConfig;
      `;

      // Create a function from the wrapped code and execute it
      const executeFunction = new Function(
        "return (async function() { " + wrappedCode + " })()"
      );
      const result = await executeFunction();

      // Validate the config
      if (!result || !result.formula) {
        throw new Error(
          "Invalid configuration returned. Configuration must include a formula property."
        );
      }

      // Log the fully extracted config
      console.log("Extracted configuration:", result);

      return result;
    } catch (error) {
      console.error("Error executing user code:", error);
      throw error; // Re-throw to show error in UI
    }
  };

  const renderFormula = async () => {
    try {
      setError(null);

      // Execute the user-provided JavaScript code
      const userConfig = await executeUserCode(formulizeInput);

      // Make sure we have a valid configuration
      if (!userConfig || !userConfig.formula) {
        throw new Error(
          "Invalid configuration. Please check your code and try again."
        );
      }

      // Use the user config
      const configToUse = userConfig;

      // Ensure the configToUse has all required properties
      if (!configToUse.formula.variables) {
        configToUse.formula.variables = {};
      }

      // Make sure we have a computation engine specified
      if (!configToUse.formula.computation) {
        console.log(
          "No computation engine specified, defaulting to symbolic-algebra"
        );
        configToUse.formula.computation = {
          engine: "symbolic-algebra",
          formula: configToUse.formula.expression.replace(/\\frac/g, ""), // Simple cleanup for formula
        };
      }

      // Log the configuration for debugging
      console.log("Using config from user JavaScript:", configToUse);
      console.log(
        "Formula computation engine:",
        configToUse.formula.computation.engine
      );

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
        setError(
          `Failed to create formula: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    } catch (err) {
      console.error("Error rendering formula:", err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Example formula configurations
  const formulaExamples = {
    kineticEnergy,
    gravitationalPotential,
    quadraticEquation,
  };

  // Handler for example button clicks
  const handleExampleClick = (example: keyof typeof formulaExamples) => {
    setFormulizeInput(formulaExamples[example]);
    setIsRendered(false); // Show the code editor with the new example
  };

  return (
    <div className="formula-renderer border border-gray-200 rounded-lg overflow-hidden">
      {!isRendered ? (
        <div className="p-4 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Formulize Definition</h2>

          {/* Example selector buttons */}
          <div className="flex space-x-2 flex-wrap">
            {(
              Object.keys(formulaExamples) as Array<
                keyof typeof formulaExamples
              >
            ).map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                {example === "kineticEnergy"
                  ? "Kinetic Energy Example"
                  : example === "gravitationalPotential"
                    ? "Gravitational Potential Example"
                    : "Quadratic Equation Example"}
              </button>
            ))}
          </div>

          <textarea
            value={formulizeInput}
            onChange={(e) => setFormulizeInput(e.target.value)}
            className="w-full p-4 border rounded font-mono text-sm h-80"
          />

          <button
            onClick={renderFormula}
            className="bg-blue-500 w-fit text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Render Formula
          </button>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
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
