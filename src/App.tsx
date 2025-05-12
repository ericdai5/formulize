import { useState, useEffect } from "react";

import BlockInteractivity from "./BlockInteractivity";
import { Debug } from "./Debug";
import DirectFormulaRenderer from "./DirectFormulaRenderer";
import { Editor } from "./Editor";
import { ElementPane } from "./ElementPane";
import EvaluationFunctionPane from "./EvaluationFunctionPane";
import LLMFunction from "./LLMFunction";
import { Menu } from "./Menu";
import { Workspace } from "./Workspace";
import { FormulizeConfig } from "./api";
import { formulaStore } from "./store";
import { computationStore } from "./computation";
import { AugmentedFormula } from "./FormulaTree";
import VisualizationRenderer from "./VisualizationRenderer";

// Ensure TypeScript knows about the global configuration property
declare global {
  interface Window {
    __lastFormulizeConfig?: FormulizeConfig;
  }
}

function App() {
  // View mode: "editor" (default) or "formulizeAPI"
  const [viewMode, setViewMode] = useState<"editor" | "formulizeAPI">("editor");
  // Add state to track the current formula configuration
  const [currentFormulaConfig, setCurrentFormulaConfig] = useState<FormulizeConfig | null>(null);
  // Add state for the computation engine selection
  const [engineType, setEngineType] = useState<"llm" | "symbolic-algebra">("llm");

  // Get the appropriate computation configuration based on the selected engine type
  const getComputationConfig = () => {
    if (engineType === "symbolic-algebra") {
      return {
        engine: "symbolic-algebra" as const,
        formula: "{K} = 0.5 * {m} * {v} * {v}"
      };
    } else {
      return {
        engine: "llm" as const,
        model: "gpt-4"
      };
    }
  };

  // Kinetic Energy Formula with dynamic computation engine and Plot2D visualization
  const kineticEnergyFormula: FormulizeConfig = {
    formula: {
      expression: "K = \\frac{1}{2}mv^2",
      variables: {
        K: {
          type: "dependent",
          units: "J",
          label: "Kinetic Energy",
          precision: 2,
        },
        m: {
          type: "input",
          value: 1,
          range: [0.1, 10],
          units: "kg",
          label: "Mass",
        },
        v: {
          type: "input",
          value: 2,
          range: [0.1, 100],
          units: "m/s",
          label: "Velocity",
        }
      },
      computation: getComputationConfig()
    },
    visualizations: [
      {
        type: "plot2d",
        config: {
          type: "plot2d",
          title: "Kinetic Energy vs. Velocity (K = ½mv²)",
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
          height: 500,
          samples: 200  // Increase samples for smoother curve
        }
      }
    ]
  };

  // Reset all formula state when switching to API examples or symbolic algebra test
  useEffect(() => {
    if (viewMode !== "editor") {
      // Clear formula store
      formulaStore.updateFormula(new AugmentedFormula([]));

      // Clear any saved Formulize config
      if (window.__lastFormulizeConfig) {
        delete window.__lastFormulizeConfig;
      }

      // Reset the current formula configuration
      setCurrentFormulaConfig(null);

      // Reset computation store variables
      computationStore.variables.clear();
      computationStore.formula = "";
      computationStore.setLastGeneratedCode(null);
      computationStore.setFormulaError(null);
      computationStore.variableTypesChanged = 0;
    }
  }, [viewMode]);

  // Update the computation engine when engineType changes
  useEffect(() => {
    if (viewMode === "formulizeAPI") {
      computationStore.computationEngine = engineType;

      // If we already have a formula configuration, update it with the new engine type
      if (currentFormulaConfig) {
        const updatedConfig = {
          ...currentFormulaConfig,
          formula: {
            ...currentFormulaConfig.formula,
            computation: getComputationConfig()
          }
        };
        setCurrentFormulaConfig(updatedConfig);
      }
    }
  }, [engineType, viewMode]);

  // Generate the JavaScript code example based on current engine type and values
  const getApiCodeExample = () => {
    const mValue = (currentFormulaConfig?.formula.variables.m?.value || kineticEnergyFormula.formula.variables.m?.value) || 1;
    const vValue = (currentFormulaConfig?.formula.variables.v?.value || kineticEnergyFormula.formula.variables.v?.value) || 2;
    
    return `// Import the Formulize API
import Formulize from './api/Formulize';

// Create a kinetic energy formula with ${engineType === "symbolic-algebra" ? "symbolic algebra" : "LLM"} computation engine
async function createKineticEnergyFormula() {
  // Define the formula configuration
  const config = {
    formula: {
      // Formula expression in LaTeX format
      expression: "K = \\frac{1}{2}mv^2",
      
      // Optional metadata
      id: "kinetic-energy",
      description: "Formula for kinetic energy",
      displayMode: "block",
      
      // Define variables and their properties
      variables: {
        // Mass variable (input)
        m: {
          type: "input",
          value: ${mValue},
          range: [0.1, 10],
          units: "kg",
          label: "Mass"
        },
        
        // Velocity variable (input)
        v: {
          type: "input", 
          value: ${vValue},
          range: [0.1, 100],
          units: "m/s",
          label: "Velocity"
        },
        
        // Kinetic energy (calculated result)
        K: {
          type: "dependent",
          units: "J",
          label: "Kinetic Energy",
          precision: 2
        }
      },
      
      // Specify computation engine
      computation: ${engineType === "symbolic-algebra" 
        ? `{
        // Use symbolic algebra engine (math.js)
        engine: "symbolic-algebra",
        
        // Define mathematical relationship between variables
        formula: "{K} = 0.5 * {m} * {v} * {v}"
      }`
        : `{
        // Use LLM for code generation
        engine: "llm",
        
        // Specify LLM model to use
        model: "gpt-4"
      }`}
    },
    
    // Optional visualizations
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

  // Create the interactive formula with the config
  const formula = await Formulize.create(config, "#formula-container");
  
  // You can interact with the formula programmatically
  formula.setVariable("m", 2.5);
  
  // Get a variable's current value
  const energy = formula.getVariable("K");
  console.log("Current kinetic energy:", energy.value, energy.units);
  
  return formula;
}

// Call the function to create and render the formula
createKineticEnergyFormula().then(formula => {
  console.log("Formula created successfully:", formula);
});`;
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="bg-blue-600 text-white p-2 flex justify-between items-center">
        <h1 className="font-bold">Formula Editor</h1>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded text-sm ${viewMode === "editor" ? "bg-blue-800 text-white" : "bg-white text-blue-600"}`}
            onClick={() => setViewMode("editor")}
          >
            Editor
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${viewMode === "formulizeAPI" ? "bg-blue-800 text-white" : "bg-white text-blue-600"}`}
            onClick={() => setViewMode("formulizeAPI")}
          >
            Formulize API
          </button>
        </div>
      </div>

      {viewMode === "formulizeAPI" ? (
        <div className="p-6 bg-white overflow-auto h-full">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Formulize API Examples</h1>
            <p className="mb-4 text-gray-600">
              This example demonstrates the declarative Formulize API for creating
              interactive formulas with computation engines as specified in
              the API documentation.
            </p>

            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium mb-2">Formulize API Example</h3>
              <p className="text-sm text-gray-600">
                This example demonstrates how to use the Formulize API to create interactive formulas.
                The computation engine is specified in the formula configuration JavaScript.
              </p>
              <div className="mt-3 text-sm text-blue-700 italic">
                Note: Change the computation engine in the formula configuration and click "Render Formula" to see the difference.
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2">Kinetic Energy Formula</h2>
              <p className="mb-3 text-gray-600">K = ½mv²</p>

              <div className="flex flex-col md:flex-row space-y-8 md:space-y-0 md:space-x-6">
                {/* Left side: Formula and Visualization */}
                <div className="flex-1 flex flex-col space-y-8">
                  {/* Formula renderer */}
                  <div className="w-full rounded-lg overflow-hidden shadow-md">
                    <div className="bg-gradient-to-r from-blue-50 to-white p-2 border-b border-blue-100">
                      <h3 className="font-medium text-blue-800">Interactive Formula</h3>
                    </div>
                    <DirectFormulaRenderer
                      formulizeConfig={{
                        formula: {
                          ...kineticEnergyFormula.formula,
                          computation: getComputationConfig()
                        },
                        visualizations: kineticEnergyFormula.visualizations
                      }}
                      height={320}
                      width="100%"
                      onConfigChange={(config) => {
                        console.log("Config changed:", config);
                        // Update the engine type based on the config
                        if (config.formula.computation.engine === "symbolic-algebra") {
                          setEngineType("symbolic-algebra");
                        } else {
                          setEngineType("llm");
                        }
                        setCurrentFormulaConfig(config);
                      }}
                    />

                    <div className="p-4 border-t border-blue-100 bg-blue-50 text-sm text-gray-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Try adjusting both <strong>mass</strong> and <strong>velocity</strong> values to see how they affect kinetic energy</li>
                        <li>The formula updates in real-time as you change input values</li>
                      </ul>
                    </div>
                  </div>

                  {/* Visualization */}
                  {((currentFormulaConfig?.visualizations || kineticEnergyFormula.visualizations) &&
                    (currentFormulaConfig?.visualizations?.length || kineticEnergyFormula.visualizations?.length)) && (
                    <div className="w-full">
                      {(currentFormulaConfig?.visualizations || kineticEnergyFormula.visualizations)?.map((visualization, index) => (
                        <VisualizationRenderer
                          key={`viz-${index}-${JSON.stringify(visualization)}`}
                          visualization={visualization}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side: Evaluation Function Pane */}
                <div className="md:w-2/5">
                  <EvaluationFunctionPane className="h-full" />
                </div>
              </div>

              <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-md">
                <h3 className="text-lg font-medium mb-2">Formulize API Code</h3>
                <p className="mb-2 text-sm text-gray-600">This is how to create this interactive formula using the Formulize API:</p>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                  {getApiCodeExample()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === "editor" ? (
        <div className="flex flex-row w-full h-full">
          <div className="w-[22%] flex flex-col border-r border-gray-200">
            <div className="flex-1 overflow-auto">
              <Editor />
            </div>
            <div className="flex-[0.8] border-t border-gray-200 overflow-auto">
              <LLMFunction />
            </div>
          </div>
          <div className="w-[56%] flex flex-col">
            <div className="flex-1 relative">
              <Menu />
              <Workspace />
            </div>
            <div className="flex-[0.8] border-t border-gray-200 overflow-auto">
              <BlockInteractivity />
            </div>
          </div>
          <div className="w-[22%] h-full border-l border-gray-200">
            <ElementPane />
          </div>
          <Debug />
        </div>
      ) : null}
    </div>
  );
}

export default App;