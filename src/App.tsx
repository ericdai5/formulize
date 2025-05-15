import { useEffect, useState } from "react";

import BlockInteractivity from "./BlockInteractivity";
import { Debug } from "./Debug";
import DirectFormulaRenderer from "./DirectFormulaRenderer";
import { Editor } from "./Editor";
import { ElementPane } from "./ElementPane";
import EvaluationFunctionPane from "./EvaluationFunctionPane";
import { AugmentedFormula } from "./FormulaTree";
import LLMFunction from "./LLMFunction";
import { Menu } from "./Menu";
import VisualizationRenderer from "./VisualizationRenderer";
import { Workspace } from "./Workspace";
import { FormulizeConfig } from "./api";
import Header from "./components/Header";
import { computationStore } from "./computation";
import { formulaStore } from "./store";

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
  const [currentFormulaConfig, setCurrentFormulaConfig] =
    useState<FormulizeConfig | null>(null);
  // Add state for the computation engine selection
  const [engineType, setEngineType] = useState<"llm" | "symbolic-algebra">(
    "llm"
  );

  // Get the appropriate computation configuration based on the selected engine type
  const getComputationConfig = () => {
    if (engineType === "symbolic-algebra") {
      return {
        engine: "symbolic-algebra" as const,
        formula: "{K} = 0.5 * {m} * {v} * {v}",
      };
    } else {
      return {
        engine: "llm" as const,
        model: "gpt-4",
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
        },
      },
      computation: getComputationConfig(),
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
            max: 20,
          },
          yAxis: {
            variable: "K",
            label: "Kinetic Energy (J)",
            min: 0,
            max: 200,
          },
          width: 800,
          height: 500,
          samples: 200, // Increase samples for smoother curve
        },
      },
    ],
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
            computation: getComputationConfig(),
          },
        };
        setCurrentFormulaConfig(updatedConfig);
      }
    }
  }, [engineType, viewMode]);

  return (
    <div className="flex flex-col w-full h-full">
      <Header viewMode={viewMode} setViewMode={setViewMode} />

      {viewMode === "formulizeAPI" ? (
        <div className="p-6 bg-white overflow-auto h-full">
          <div className="w-full mx-auto">
            <div className="mb-8">
              <div className="flex flex-col md:flex-row space-y-8 md:space-y-0 md:space-x-6">
                <div className="flex-1 flex flex-col space-y-8">
                  <div className="w-full rounded-lg overflow-hidden">
                    <DirectFormulaRenderer
                      formulizeConfig={{
                        formula: {
                          ...kineticEnergyFormula.formula,
                          computation: getComputationConfig(),
                        },
                        visualizations: kineticEnergyFormula.visualizations,
                      }}
                      height={320}
                      width="100%"
                      onConfigChange={(config) => {
                        console.log("Config changed:", config);
                        // Update the engine type based on the config
                        if (
                          config.formula.computation.engine ===
                          "symbolic-algebra"
                        ) {
                          setEngineType("symbolic-algebra");
                        } else {
                          setEngineType("llm");
                        }
                        setCurrentFormulaConfig(config);
                      }}
                    />
                  </div>

                  {/* Visualization */}
                  {(currentFormulaConfig?.visualizations ||
                    kineticEnergyFormula.visualizations) &&
                    (currentFormulaConfig?.visualizations?.length ||
                      kineticEnergyFormula.visualizations?.length) && (
                      <div className="w-full">
                        {(
                          currentFormulaConfig?.visualizations ||
                          kineticEnergyFormula.visualizations
                        )?.map((visualization, index) => (
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
