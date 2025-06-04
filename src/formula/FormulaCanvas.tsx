import { useEffect, useRef, useState } from "react";

import { Formulize, FormulizeConfig } from "../api/index.ts";
import kineticEnergy from "../examples/kineticEnergy.ts";
import { IFormula } from "../types/formula.ts";
import BlockInteractivity, { VariableRange } from "./BlockInteractivity.tsx";
import FormulaCodeEditor from "./FormulaCodeEditor.tsx";

import codeIcon from "../Icons/code.svg";
import functionIcon from "../Icons/function.svg";

interface FormulaCanvasProps {
  formulizeConfig?: FormulizeConfig;
  formulizeFormula?: IFormula;
  autoRender?: boolean;
  onConfigChange?: (config: FormulizeConfig) => void;
  onOpenEvaluationModal?: () => void;
}

const FormulaCanvas = ({
  formulizeConfig,
  formulizeFormula,
  autoRender = true,
  onConfigChange,
  onOpenEvaluationModal,
}: FormulaCanvasProps) => {
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
  const renderFormula = async (inputOverride?: string) => {
    try {
      setError(null);
      const inputToUse = inputOverride ?? formulizeInput;
      const userConfig = await executeUserCode(inputToUse);
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

      // Create the formula using Formulize API and handle success:
      // • Create formula instance with Formulize.create()
      // • Store config globally for access by other components
      // • Store current config in state
      // • Notify parent of config change via callback if provided
      try {
        await Formulize.create(configToUse);
        window.__lastFormulizeConfig = configToUse;
        setCurrentConfig(configToUse);
        if (onConfigChange) {
          onConfigChange(configToUse);
        }
      } catch (e) {
        setError(
          `Failed to create formula: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="formula-renderer overflow-hidden w-full h-full border-r border-slate-200">
      <div className="flex flex-col w-full h-full relative">
        <div className="absolute right-4 top-4 gap-3 flex flex-row z-20">
          <button
            onClick={() => setIsRendered(!isRendered)}
            className="text-base bg-white border border-slate-200 h-8 w-8 rounded-xl flex items-center justify-center shadow-sm hover:shadow-md hover:bg-slate-50 hover:scale-105 transition-all duration-100"
          >
            <img src={codeIcon} alt="Edit" className="w-4 h-4" />
          </button>
          {onOpenEvaluationModal && (
            <button
              onClick={onOpenEvaluationModal}
              className="bg-white border border-slate-200 h-8 w-8 rounded-xl flex items-center justify-center shadow-sm hover:shadow-md hover:bg-slate-50 hover:scale-105 transition-all duration-100"
            >
              <img
                src={functionIcon}
                alt="Open Evaluation"
                className="w-4 h-4"
              />
            </button>
          )}
        </div>
        <div
          ref={containerRef}
          className={`interactive-formula-container w-full flex justify-center items-center overflow-auto transition-all duration-300 ease-in-out ${
            isRendered ? "h-full" : "h-1/2"
          }`}
        >
          <div className="min-w-0">
            <BlockInteractivity
              variableRanges={
                currentConfig ? extractVariableRanges(currentConfig) : {}
              }
              defaultMin={-100}
              defaultMax={100}
            />
          </div>
        </div>
        <div
          className={`absolute inset-x-0 bottom-0 h-1/2 transition-transform duration-300 ease-in-out ${
            isRendered ? "translate-y-full" : "translate-y-0"
          }`}
        >
          <FormulaCodeEditor
            formulizeInput={formulizeInput}
            onInputChange={setFormulizeInput}
            onRender={renderFormula}
            error={error}
          />
        </div>
      </div>
    </div>
  );
};

export default FormulaCanvas;
