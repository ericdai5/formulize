import { useEffect, useRef, useState } from "react";

import { Formulize, FormulizeConfig } from "../api/index.ts";
import IconButton from "../components/IconButton.tsx";
import Modal from "../components/Modal.tsx";
import StorePane from "../components/StorePane.tsx";
import kineticEnergy from "../examples/kineticEnergy.ts";
import { FormulaElementPane } from "../pages/api/FormulaElementPane.tsx";
import FormulaCodeEditor from "../pages/api/api-code-editor.tsx";
import { IEnvironment } from "../types/environment.ts";
import { VariableTreePane } from "./VariableTreePane.tsx";
import Formula, { VariableRange } from "./formula.tsx";

import codeIcon from "../Icons/code.svg";
import functionIcon from "../Icons/function.svg";
import storeIcon from "../Icons/store.svg";
import treeIcon from "../Icons/tree.svg";
import variableIcon from "../Icons/variable.svg";

// Wrapper component to handle multiple variable trees
const VariableTreesPane = ({ config }: { config: FormulizeConfig | null }) => {
  const variableNames = config?.variables ? Object.keys(config.variables) : [];

  // Empty state component
  const EmptyState = ({ message }: { message: string }) => (
    <div className="pt-3 pl-4 pr-4 pb-4 gap-4 flex flex-col h-full overflow-hidden select-none text-base">
      <div className="text-gray-500 text-sm">{message}</div>
    </div>
  );

  if (!config) return <EmptyState message="No configuration available" />;
  if (variableNames.length === 0)
    return <EmptyState message="No variables found in configuration" />;

  return (
    <div className="h-full overflow-hidden flex flex-col flex-1 overflow-y-auto">
      {variableNames.map((variableName, index) => (
        <div key={variableName} className={index > 0 ? "border-t" : ""}>
          <VariableTreePane
            variableName={variableName}
            title={`Variable ${index + 1}: ${variableName}`}
          />
        </div>
      ))}
    </div>
  );
};

interface FormulaCanvasProps {
  formulizeConfig?: FormulizeConfig;
  formulizeFormula?: IEnvironment;
  autoRender?: boolean;
  onConfigChange?: (config: FormulizeConfig) => void;
  onOpenEvaluationModal?: () => void;
  onOpenStoreModal?: () => void;
}

const FormulaCanvas = ({
  formulizeConfig,
  formulizeFormula,
  autoRender = true,
  onConfigChange,
  onOpenEvaluationModal,
  onOpenStoreModal,
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
  const [showStoreModal, setShowStoreModal] = useState<boolean>(false);
  const [showElementPane, setShowElementPane] = useState<boolean>(false);
  const [showVariableTreePane, setShowVariableTreePane] =
    useState<boolean>(false);
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

  const handleOpenStoreModal = () => {
    if (onOpenStoreModal) {
      onOpenStoreModal();
    } else {
      setShowStoreModal(true);
    }
  };

  return (
    <div className="formula-renderer overflow-hidden w-full h-full border-r border-slate-200">
      <div className="flex flex-col w-full h-full relative">
        <div className="absolute right-4 top-4 gap-3 flex flex-row z-20">
          <IconButton
            icon={codeIcon}
            alt="Edit"
            onClick={() => setIsRendered(!isRendered)}
          />
          {onOpenEvaluationModal && (
            <IconButton
              icon={functionIcon}
              alt="Open Evaluation"
              onClick={onOpenEvaluationModal}
            />
          )}
          <IconButton
            icon={treeIcon}
            alt="Show Elements"
            onClick={() => setShowElementPane(true)}
            title="Show Elements"
          />
          <IconButton
            icon={variableIcon}
            alt="Show Variable Trees"
            onClick={() => setShowVariableTreePane(true)}
            title="Show Variable Trees"
          />
          <IconButton
            icon={storeIcon}
            alt="Store"
            onClick={handleOpenStoreModal}
          />
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

      {/* Element Pane Modal */}
      <Modal
        isOpen={showElementPane}
        onClose={() => setShowElementPane(false)}
        title="Formula Elements"
        maxWidth="max-w-md"
      >
        <FormulaElementPane />
      </Modal>

      {/* Variable Tree Pane Modal */}
      <Modal
        isOpen={showVariableTreePane}
        onClose={() => setShowVariableTreePane(false)}
        title="Variable Trees"
        maxWidth="max-w-2xl"
      >
        <VariableTreesPane config={currentConfig} />
      </Modal>

      {/* Store Modal */}
      <Modal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        title="Computation Store Variables"
        maxWidth="max-w-2xl"
      >
        <StorePane className="h-full" />
      </Modal>
    </div>
  );
};

export default FormulaCanvas;
