import { useState, useEffect } from "react";

import BlockInteractivity from "./BlockInteractivity";
import { Debug } from "./Debug";
import DirectFormulaRenderer from "./DirectFormulaRenderer";
import { Editor } from "./Editor";
import { ElementPane } from "./ElementPane";
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
  const [showFormulizeAPI, setShowFormulizeAPI] = useState(false);
  // Add state to track the current formula configuration
  const [currentFormulaConfig, setCurrentFormulaConfig] = useState<FormulizeConfig | null>(null);

  // Kinetic Energy Formula with LLM computation engine and Plot2D visualization
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
      computation: {
        engine: "llm",
        model: "gpt-4"
      }
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

  // Reset all formula state when switching to API examples
  useEffect(() => {
    if (showFormulizeAPI) {
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
  }, [showFormulizeAPI]);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="bg-blue-600 text-white p-2 flex justify-between items-center">
        <h1 className="font-bold">Formula Editor</h1>
        <button
          className="bg-white text-blue-600 px-3 py-1 rounded text-sm"
          onClick={() => setShowFormulizeAPI(!showFormulizeAPI)}
        >
          {showFormulizeAPI ? "Back to Editor" : "Formulize API Examples"}
        </button>
      </div>

      {showFormulizeAPI ? (
        <div className="p-6 bg-white overflow-auto h-full">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Formulize API Examples</h1>
            <p className="mb-4 text-gray-600">
              This example demonstrates the declarative Formulize API for creating
              interactive formulas with LLM-powered computation as specified in
              the API documentation.
            </p>

            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2">Kinetic Energy Formula</h2>
              <p className="mb-3 text-gray-600">K = ½mv²</p>

              <div className="flex flex-col space-y-8">
                {/* Formula renderer with increased height */}
                <div className="w-full rounded-lg overflow-hidden shadow-md">
                  <div className="bg-gradient-to-r from-blue-50 to-white p-2 border-b border-blue-100">
                    <h3 className="font-medium text-blue-800">Interactive Formula</h3>
                  </div>
                  <DirectFormulaRenderer
                    formulizeConfig={kineticEnergyFormula}
                    height={400}
                    width="100%"
                    onConfigChange={setCurrentFormulaConfig}
                  />

                  <div className="p-4 border-t border-blue-100 bg-blue-50 text-sm text-gray-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Try adjusting both <strong>mass</strong> and <strong>velocity</strong> values to see how they affect kinetic energy</li>
                      <li>The formula updates in real-time as you change input values</li>
                    </ul>
                  </div>
                </div>

                {/* Use the current formula configuration if available, otherwise fall back to default */}
                {((currentFormulaConfig?.visualizations || kineticEnergyFormula.visualizations) &&
                  (currentFormulaConfig?.visualizations?.length || kineticEnergyFormula.visualizations?.length)) && (
                  <div className="w-full">
                    {(currentFormulaConfig?.visualizations || kineticEnergyFormula.visualizations)?.map((visualization, index) => (
                      <VisualizationRenderer
                        key={`viz-${index}-${JSON.stringify(visualization)}`} // Key includes visualization config to force re-render
                        visualization={visualization}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-md">
                <h3 className="text-lg font-medium mb-2">Formulize API Code</h3>
                <p className="mb-2 text-sm text-gray-600">This is the code used to create the interactive formula and visualization:</p>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
{
  // Display the current formula configuration or the initial one
  JSON.stringify(currentFormulaConfig || kineticEnergyFormula, null, 2)
}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default App;