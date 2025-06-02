import { useEffect, useRef, useState } from "react";

import { Formulize, FormulizeConfig } from "./api";
import gravitationalPotential from "./examples/gravitationalPotential.ts";
import kineticEnergy from "./examples/kineticEnergy.ts";
import quadraticEquation from "./examples/quadraticEquation.ts";
import BlockInteractivity, {
  VariableRange,
} from "./formula/BlockInteractivity.tsx";
import { IFormula } from "./types/formula";

interface DirectFormulaRendererProps {
  formulizeConfig?: FormulizeConfig;
  formulizeFormula?: IFormula;
  autoRender?: boolean;
  height?: number | string;
  width?: number | string;
  onConfigChange?: (config: FormulizeConfig) => void;
}

const DirectFormulaRenderer = ({
  formulizeConfig,
  formulizeFormula,
  autoRender = true,
  height = 300,
  width = "100%",
  onConfigChange,
}: DirectFormulaRendererProps) => {
  // Use formulizeConfig if provided, otherwise use the formulizeFormula, or fall back to null
  const initialConfig = formulizeConfig?.formula
    ? formulizeConfig
    : formulizeFormula
      ? { formula: formulizeFormula }
      : null;

  // Convert the config to a JavaScript format for display
  // Use the kineticEnergy template as the default template
  const configToJsString = (config: FormulizeConfig | null): string => {
    return kineticEnergy;
  };

  const [formulizeInput, setFormulizeInput] = useState<string>(
    configToJsString(initialConfig)
  );
  const [isRendered, setIsRendered] = useState<boolean>(autoRender);
  const [error, setError] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<FormulizeConfig | null>(
    initialConfig
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract variable ranges from Formulize configuration
  // This function converts Formulize variable ranges to the format expected by BlockInteractivity
  // Variables with type 'input' and a range [min, max] become slidable with those limits
  const extractVariableRanges = (
    config: FormulizeConfig
  ): Record<string, VariableRange> => {
    const ranges: Record<string, VariableRange> = {};
    if (config.formula?.variables) {
      Object.entries(config.formula.variables).forEach(
        ([variableName, variableConfig]) => {
          if (variableConfig.type === "input" && variableConfig.range) {
            const [min, max] = variableConfig.range;
            ranges[variableName] = { min, max };
          }
        }
      );
    }

    return ranges;
  };

  useEffect(() => {
    if (autoRender) {
      renderFormula();
    }
  }, []);

  // Update the formula display when the config changes
  useEffect(() => {
    if (formulizeConfig && formulizeConfig !== initialConfig) {
      setFormulizeInput(configToJsString(formulizeConfig));
    }
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

  // Execute the user-provided JavaScript code
  // Make sure we have a valid configuration
  const renderFormula = async () => {
    try {
      setError(null);
      const userConfig = await executeUserCode(formulizeInput);
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
        configToUse.formula.computation = {
          engine: "symbolic-algebra",
          formula: configToUse.formula.expression.replace(/\\frac/g, ""), // Simple cleanup for formula
        };
      }

      // Create the formula using Formulize API
      try {
        const formulizeInstance = await Formulize.create(configToUse);

        // Store the config globally for access by other components
        window.__lastFormulizeConfig = configToUse;

        // Store the current config in state
        setCurrentConfig(configToUse);

        // Notify parent of config change via callback if provided
        if (onConfigChange) {
          onConfigChange(configToUse);
        }

        setIsRendered(true);
      } catch (e) {
        setError(
          `Failed to create formula: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    } catch (err) {
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
            <BlockInteractivity
              variableRanges={
                currentConfig ? extractVariableRanges(currentConfig) : {}
              }
              defaultMin={-100}
              defaultMax={100}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectFormulaRenderer;
