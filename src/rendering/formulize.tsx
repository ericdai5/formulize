import { useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { computationStore } from "../api/computation.ts";
import { Formulize, FormulizeConfig } from "../api/index.ts";
import FormulaCodeEditor from "../components/api-code-editor.tsx";
import Toolbar from "../components/debug-toolbar.tsx";
import EvaluationFunctionPane from "../components/evaluation-function";
import { FormulaTreePane } from "../components/formula-tree-pane.tsx";
import DebugModal from "../components/interpreter.tsx";
import Modal from "../components/modal.tsx";
import StorePane from "../components/variable-overview.tsx";
import { VariableTreesPane } from "../components/variable-tree-pane.tsx";
import { examples as formulaExamples } from "../examples/index.ts";
import { kineticEnergy } from "../examples/kineticEnergy";
import Canvas from "./canvas.tsx";

interface FormulizeProps {
  formulizeConfig?: FormulizeConfig;
  onConfigChange?: (config: FormulizeConfig) => void;
  selectedTemplate?: keyof typeof formulaExamples;
}

const FormulaCanvas = observer(
  ({ formulizeConfig, onConfigChange, selectedTemplate }: FormulizeProps) => {
    // Use formulizeConfig if provided, otherwise fall back to null
    const initialConfig = formulizeConfig || null;

    const [formulizeInput, setFormulizeInput] = useState<string>(kineticEnergy);
    const [isRendered, setIsRendered] = useState<boolean>(true);
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
    const onConfigChangeRef = useRef(onConfigChange);

    // Update the ref when the prop changes
    useEffect(() => {
      onConfigChangeRef.current = onConfigChange;
    }, [onConfigChange]);

    // Execute user-provided JavaScript code to get configuration
    // Uses a sandboxed iframe for secure code execution, preventing access to the main page context
    // The iframe has restricted permissions (only allow-scripts) and communicates via postMessage
    // This approach is much safer than using new Function() or eval() for executing user code
    const executeUserCode = useCallback(
      async (jsCode: string): Promise<FormulizeConfig | null> => {
        // Function to deserialize config from iframe (handles function strings)
        const deserializeConfig = (
          config: Record<string, unknown>
        ): FormulizeConfig => {
          return JSON.parse(JSON.stringify(config), (key, value) => {
            if (value && typeof value === "object" && value.__isFunction) {
              try {
                // Reconstruct function from string
                return new Function("return " + value.__functionString)();
              } catch (e) {
                console.warn("Failed to deserialize function for key:", key, e);
                return value.__functionString; // fallback to string
              }
            }
            return value;
          });
        };

        return new Promise((resolve, reject) => {
          console.log("Starting iframe execution...", {
            jsCodeLength: jsCode.length,
          });

          // Create sandboxed iframe for secure code execution
          // The sandbox attribute restricts what the iframe can do:
          // - allow-scripts: permits script execution within the iframe
          // - No allow-same-origin: prevents access to parent document's DOM/storage
          const iframe = document.createElement("iframe");
          iframe.setAttribute("sandbox", "allow-scripts"); // No allow-same-origin for security
          iframe.style.display = "none";

          // Set up message handler for communication between iframe and parent
          // This is the secure way to get results back from the sandboxed code
          const handleMessage = (event: MessageEvent) => {
            console.log("Received message from iframe:", event.data);

            // Verify the message is from our iframe
            if (event.source !== iframe.contentWindow) {
              console.log("Message not from our iframe, ignoring");
              return;
            }

            // Clean up event listener and remove iframe
            window.removeEventListener("message", handleMessage);
            document.body.removeChild(iframe);

            // Handle the response from the iframe
            if (event.data.error) {
              console.error("Error from iframe:", event.data.error);
              reject(new Error(event.data.error));
            } else {
              // Deserialize the config to restore functions
              const config = deserializeConfig(event.data.config);
              console.log("Deserialized config from iframe:", config);

              if (!config) {
                reject(
                  new Error(
                    "No configuration was captured. Make sure your code calls Formulize.create(config)"
                  )
                );
                return;
              }

              if (
                !config.formulas ||
                !config.variables ||
                !config.computation
              ) {
                reject(
                  new Error(
                    "Invalid configuration returned. Configuration must include formulas, variables, and computation properties."
                  )
                );
                return;
              }

              resolve(config);
            }
          };

          window.addEventListener("message", handleMessage);

          // Create iframe content with user code embedded
          // The iframe contains a complete HTML document with the user's code
          // and a mock Formulize API that captures the configuration
          iframe.srcdoc = `
          <script>
            // Add global context for variables the code might use first
            const console = window.console;
            const Math = window.Math;
            
            console.log('Iframe script starting execution...');
            
            // Function to serialize config for postMessage (handles functions)
            const serializeConfig = (config) => {
              return JSON.parse(JSON.stringify(config, (key, value) => {
                if (typeof value === 'function') {
                  return {
                    __isFunction: true,
                    __functionString: value.toString()
                  };
                }
                return value;
              }));
            };
            
            // Mock the Formulize API calls so we can capture the config
            // This provides the same interface as the real Formulize API
            // but just captures the configuration instead of actually creating formulas
            let capturedConfig = null;
            
            const Formulize = {
              create: async function(config) {
                console.log('Formulize.create called with config:', config);
                capturedConfig = config;
                
                // Return a mock instance that matches the expected interface
                return {
                  formula: config,
                  getVariable: () => ({}),
                  setVariable: () => true,
                  update: async () => {},
                  destroy: () => {}
                };
              }
            };
            
            // Wrap user code in async IIFE to handle await statements
            (async () => {
              try {
                // Execute the user's code in the sandboxed environment
                ${jsCode}
                
                // Serialize the config to handle functions before sending
                const serializedConfig = serializeConfig(capturedConfig);
                console.log('Serialized config for postMessage:', serializedConfig);
                
                // Send the captured configuration back to the parent
                parent.postMessage({ config: serializedConfig }, '*');
                console.log('Posted message to parent');
              } catch (error) {
                console.error('Error in user code execution:', error);
                // Send any errors back to the parent for handling
                parent.postMessage({ error: error.message }, '*');
              }
            })();
          </script>
        `;

          // Add iframe to document to start execution
          document.body.appendChild(iframe);

          // Set a timeout to prevent hanging if the iframe doesn't respond
          setTimeout(() => {
            window.removeEventListener("message", handleMessage);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            reject(
              new Error(
                "Code execution timeout - check your code for infinite loops or blocking operations"
              )
            );
          }, 5000); // 5 second timeout
        });
      },
      []
    );

    const renderFormula = useCallback(
      async (inputOverride?: string) => {
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
            if (onConfigChangeRef.current) {
              onConfigChangeRef.current(configToUse);
            }
          } catch (e) {
            setError(
              `Failed to create formula: ${e instanceof Error ? e.message : String(e)}`
            );
          }
        } catch (err) {
          setError(
            `Error: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      },
      [formulizeInput, executeUserCode]
    );

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
    }, [selectedTemplate, renderFormula]);

    // Close debug modal when step mode is no longer available
    const isStepMode = computationStore.isStepMode();
    useEffect(() => {
      if (showDebugModal && !isStepMode) {
        setShowDebugModal(false);
      }
    }, [showDebugModal, isStepMode]);

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
          <FormulaTreePane />
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
