import { useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { computationStore } from "../api/computation.ts";
import { Formulize, FormulizeConfig } from "../api/index.ts";
import FormulaCodeEditor from "../components/api-code-editor.tsx";
import Toolbar from "../components/debug-toolbar.tsx";
import EvaluationFunctionPane from "../components/evaluation-function";
import DebugModal from "../components/interpreter.tsx";
import Modal from "../components/modal.tsx";
import StorePane from "../components/variable-overview.tsx";
import { examples as formulaExamples } from "../examples/index.ts";
import { kineticEnergy } from "../examples/kineticEnergy";
import { FormulaElementPane } from "../pages/api/formula-tree-pane.tsx";
import { VariableTreesPane } from "../pages/api/variable-tree-pane.tsx";
import Canvas from "./canvas.tsx";

interface FormulaCanvasProps {
  formulizeConfig?: FormulizeConfig;
  autoRender?: boolean;
  onConfigChange?: (config: FormulizeConfig) => void;
  selectedTemplate?: keyof typeof formulaExamples;
}

const FormulaCanvas = observer(
  ({
    formulizeConfig,
    autoRender = true,
    onConfigChange,
    selectedTemplate,
  }: FormulaCanvasProps) => {
    // Use formulizeConfig if provided, otherwise fall back to null
    const initialConfig = formulizeConfig || null;

    const [formulizeInput, setFormulizeInput] = useState<string>(kineticEnergy);
    const [isRendered, setIsRendered] = useState<boolean>(autoRender);
    const [error, setError] = useState<string | null>(null);
    const [currentConfig, setCurrentConfig] = useState<FormulizeConfig | null>(
      initialConfig
    );
    const [showStoreModal, setShowStoreModal] = useState<boolean>(false);
    const [showEvaluationModal, setShowEvaluationModal] =
      useState<boolean>(false);
    const [showElementPane, setShowElementPane] = useState<boolean>(false);
    const [showVariableTreePane, setShowVariableTreePane] =
      useState<boolean>(false);
    const [showDebugModal, setShowDebugModal] = useState<boolean>(false);
    const [showVariableBorders, setShowVariableBorders] =
      useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract variable ranges from Formulize configuration
    // This function converts Formulize variable ranges to the format expected by BlockInteractivity
    // Variables with type 'input' and a range [min, max] become slidable with those limits
    const extractVariableRanges = (
      config: FormulizeConfig
    ): Record<string, [number, number]> => {
      const ranges: Record<string, [number, number]> = {};
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
        setFormulizeInput(kineticEnergy);
      }
    }, [initialConfig, formulizeConfig]);

    // Update formulize input when selectedTemplate changes
    useEffect(() => {
      if (selectedTemplate && formulaExamples[selectedTemplate]) {
        const newFormula = formulaExamples[selectedTemplate];
        setFormulizeInput(newFormula);
        renderFormula(newFormula);
      }
    }, [selectedTemplate]);

    // Close debug modal when step mode is no longer available
    const isStepMode = computationStore.isStepMode();
    useEffect(() => {
      if (showDebugModal && !isStepMode) {
        setShowDebugModal(false);
      }
    }, [showDebugModal, isStepMode]);

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
            capturedConfig = config;
            
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
        // • Store config in component state for access by child components
        // • Notify parent of config change via callback if provided
        try {
          await Formulize.create(configToUse);
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
      setShowStoreModal(true);
    };

    const handleOpenEvaluationModal = () => {
      setShowEvaluationModal(true);
    };

    return (
      <div className="formula-renderer overflow-hidden w-full h-full border-r border-slate-200">
        <div className="flex flex-col w-full h-full relative">
          <Toolbar
            onToggleRender={() => setIsRendered(!isRendered)}
            onOpenEvaluationModal={handleOpenEvaluationModal}
            onShowElementPane={() => setShowElementPane(true)}
            onShowVariableTreePane={() => setShowVariableTreePane(true)}
            onShowDebugModal={() => setShowDebugModal(true)}
            onOpenStoreModal={handleOpenStoreModal}
            onToggleVariableBorders={() =>
              setShowVariableBorders(!showVariableBorders)
            }
            showDebugButton={isStepMode}
          />
          <div
            ref={containerRef}
            className="interactive-formula-container w-full h-full overflow-auto"
          >
            <div className="min-w-0 w-full h-full overflow-auto bg-slate-50 text-center">
              <Canvas
                variableRanges={
                  currentConfig ? extractVariableRanges(currentConfig) : {}
                }
                controls={currentConfig?.controls}
                environment={currentConfig || undefined}
                showVariableBorders={showVariableBorders}
              />
            </div>
          </div>
          <div
            className={`absolute inset-x-0 bottom-0 h-1/2 transition-transform duration-300 ease-in-out z-10 ${
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
        {/* Evaluation Modal */}
        <Modal
          isOpen={showEvaluationModal}
          onClose={() => setShowEvaluationModal(false)}
          title="Evaluation Function"
          maxWidth="max-w-4xl"
        >
          <EvaluationFunctionPane className="h-full" />
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
        {/* Debug Modal */}
        <DebugModal
          isOpen={showDebugModal}
          onClose={() => setShowDebugModal(false)}
          environment={currentConfig}
        />
      </div>
    );
  }
);

export default FormulaCanvas;
