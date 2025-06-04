import { useEffect, useState } from "react";

import EvaluationFunctionPane from "../EvaluationFunctionPane";
import { FormulizeConfig } from "../api";
import { computationStore } from "../computation";
import FormulaCanvas from "../formula/FormulaCanvas";
import VisualizationRenderer from "../visualizations/VisualizationRenderer";

export default function APIPage() {
  // Add state for the computation engine selection
  const [engineType, setEngineType] = useState<"llm" | "symbolic-algebra">(
    "llm"
  );
  const [currentFormulaConfig, setCurrentFormulaConfig] =
    useState<FormulizeConfig | null>(null);
  // Add modal state for EvaluationFunctionPane
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);

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
          width: 600,
          height: 600,
        },
      },
    ],
  };

  // Update the current formula config when engineType changes
  useEffect(() => {
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
  }, [engineType]);

  // Update the computation engine when engineType changes
  useEffect(() => {
    computationStore.computationEngine = engineType;
  }, [engineType]);

  return (
    <div className="bg-white overflow-auto w-full h-full mx-auto">
      <div className="flex flex-row w-full h-full">
        <div className="w-1/2">
          <FormulaCanvas
            formulizeConfig={{
              formula: {
                ...kineticEnergyFormula.formula,
                computation: getComputationConfig(),
              },
              visualizations: kineticEnergyFormula.visualizations,
            }}
            onConfigChange={(config) => {
              console.log("Config changed:", config);
              // Update the engine type based on the config
              if (config.formula.computation?.engine === "symbolic-algebra") {
                setEngineType("symbolic-algebra");
              } else {
                setEngineType("llm");
              }
              setCurrentFormulaConfig(config);
            }}
            onOpenEvaluationModal={() => setIsEvaluationModalOpen(true)}
          />
        </div>

        {/* Visualization */}
        {currentFormulaConfig?.visualizations &&
          currentFormulaConfig?.visualizations?.length && (
            <div className="w-1/2 h-full overflow-auto">
              {currentFormulaConfig?.visualizations?.map(
                (visualization, index) => (
                  <VisualizationRenderer
                    key={`viz-${index}-${JSON.stringify(visualization)}`}
                    visualization={visualization}
                  />
                )
              )}
            </div>
          )}
      </div>

      {/* Evaluation Modal */}
      {isEvaluationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Modal backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsEvaluationModalOpen(false)}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Evaluation Function</h2>
              <button
                onClick={() => setIsEvaluationModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 max-h-[calc(80vh-8rem)] overflow-auto">
              <EvaluationFunctionPane className="h-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
