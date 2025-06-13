import { useEffect, useRef, useState } from "react";

import { computationStore } from "../api/computation.ts";
import { Formulize, FormulizeConfig } from "../api/index.ts";
import kineticEnergy from "../examples/kineticEnergy.ts";
import { IEnvironment } from "../types/environment.ts";
import FormulaCodeEditor from "./FormulaCodeEditor.tsx";
import Formula, { VariableRange } from "./formula.tsx";

import codeIcon from "../Icons/code.svg";
import functionIcon from "../Icons/function.svg";

interface FormulaCanvasProps {
  formulizeConfig?: FormulizeConfig;
  formulizeFormula?: IEnvironment;
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
  const initialConfig = formulizeConfig?.formulas
    ? formulizeConfig
    : formulizeFormula
      ? formulizeFormula
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
  const [showVariableModal, setShowVariableModal] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract variable ranges from Formulize configuration
  // This function converts Formulize variable ranges to the format expected by BlockInteractivity
  // Variables with type 'input' and a range [min, max] become slidable with those limits
  const extractVariableRanges = (
    config: FormulizeConfig
  ): Record<string, VariableRange> => {
    const ranges: Record<string, VariableRange> = {};
    if (config.variables) {
      Object.entries(config.variables).forEach(
        ([variableName, variableConfig]) => {
          if (variableConfig.type === "input" && variableConfig.range) {
            const [min, max] = variableConfig.range;
            ranges[variableName] = [min, max];
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
            
            // Return a mock instance
            return {
              formula: config,
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
      if (
        !result ||
        !result.formulas ||
        !result.variables ||
        !result.computation
      ) {
        throw new Error(
          "Invalid configuration returned. Configuration must include formulas, variables, and computation properties."
        );
      }

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
      if (
        !userConfig ||
        !userConfig.formulas ||
        !userConfig.variables ||
        !userConfig.computation
      ) {
        throw new Error(
          "Invalid configuration. Please check your code and try again."
        );
      }

      // Use the user config
      const configToUse = userConfig;

      // Ensure the configToUse has all required properties
      if (!configToUse.variables) {
        configToUse.variables = {};
      }

      // Make sure we have a computation engine specified
      if (!configToUse.computation) {
        configToUse.computation = {
          engine: "symbolic-algebra",
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

  const handleGetVariableIds = () => {
    setShowVariableModal(true);
  };

  const getVariableData = () => {
    const formulas = computationStore.displayedFormulas;
    const computationFunctions = computationStore.computationFunctions;

    return {
      variables: Array.from(computationStore.variables.entries()).map(
        ([id, variable]) => ({
          id,
          symbol: variable.symbol,
          type: variable.type,
          value: variable.value,
          error: variable.error,
        })
      ),
      formulas: formulas.map((latex, index) => ({
        index,
        latex,
        expression: computationFunctions[index] || "N/A",
      })),
    };
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
          <button
            onClick={handleGetVariableIds}
            className="bg-white border border-slate-200 h-8 w-8 rounded-xl flex items-center justify-center shadow-sm hover:shadow-md hover:bg-slate-50 hover:scale-105 transition-all duration-100"
            title="Get Variable IDs"
          >
            <span className="text-xs font-mono font-bold">ID</span>
          </button>
        </div>
        <div
          ref={containerRef}
          className={`interactive-formula-container w-full overflow-auto transition-all duration-300 ease-in-out ${
            isRendered ? "h-full" : "h-1/2"
          }`}
        >
          <div className="min-w-0 w-full h-full overflow-auto p-8 bg-slate-50 text-center">
            <Formula
              variableRanges={
                currentConfig ? extractVariableRanges(currentConfig) : {}
              }
              controls={currentConfig?.controls}
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

      {/* Variable IDs Modal */}
      {showVariableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Computation Store Variables</h2>
              <button
                onClick={() => setShowVariableModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {getVariableData().variables.length === 0 ? (
                <p className="text-gray-500 italic">
                  No variables found in computation store
                </p>
              ) : (
                getVariableData().variables.map((variable) => (
                  <div
                    key={variable.id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <strong>ID:</strong> {variable.id}
                      </div>
                      <div>
                        <strong>Symbol:</strong> {variable.symbol}
                      </div>
                      <div>
                        <strong>Type:</strong>{" "}
                        <span className="capitalize">{variable.type}</span>
                      </div>
                      <div>
                        <strong>Value:</strong> {variable.value}
                      </div>
                      {variable.error && (
                        <div className="col-span-2">
                          <strong>Error:</strong>{" "}
                          <span className="text-red-600">{variable.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* LaTeX Formulas Section */}
            {getVariableData().formulas.length > 0 && (
              <>
                <div className="mt-6 mb-4">
                  <h3 className="text-lg font-semibold">LaTeX Formulas</h3>
                </div>
                <div className="space-y-3">
                  {getVariableData().formulas.map((formula) => (
                    <div
                      key={formula.index}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Formula {formula.index + 1}:</strong>
                        </div>
                        <div className="bg-gray-50 p-2 rounded font-mono text-xs overflow-x-auto">
                          <strong>LaTeX:</strong> {formula.latex}
                        </div>
                        <div className="bg-gray-50 p-2 rounded font-mono text-xs overflow-x-auto">
                          <strong>Expression:</strong> {formula.expression}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Total variables: {getVariableData().variables.length}
              </p>
              {getVariableData().formulas.length > 0 && (
                <p className="text-sm text-gray-600">
                  Total formulas: {getVariableData().formulas.length}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaCanvas;
