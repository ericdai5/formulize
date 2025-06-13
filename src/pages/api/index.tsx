import { useEffect, useState } from "react";

import { FormulizeConfig } from "../../api/Formulize";
import { computationStore } from "../../api/computation";
import EvaluationFunctionPane from "../../components/EvaluationFunctionPane";
import FormulaCanvas from "../../formula/formula-canvas";
import VisualizationRenderer from "../../visualizations/VisualizationRenderer";

export default function APIPage() {
  const [currentFormulaConfig, setCurrentFormulaConfig] = useState<
    FormulizeConfig | undefined
  >(undefined);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);

  useEffect(() => {
    if (currentFormulaConfig?.computation?.engine) {
      computationStore.computationEngine =
        currentFormulaConfig.computation.engine;
    }
  }, [currentFormulaConfig?.computation?.engine]);

  return (
    <div className="bg-white overflow-auto w-full h-full mx-auto">
      <div className="flex flex-row w-full h-full">
        <div className="w-1/2">
          <FormulaCanvas
            formulizeConfig={currentFormulaConfig}
            onConfigChange={(config) => {
              console.log("Config changed:", config);
              setCurrentFormulaConfig(config);
            }}
            onOpenEvaluationModal={() => setIsEvaluationModalOpen(true)}
          />
        </div>
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
      {isEvaluationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsEvaluationModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-end p-2 border-b">
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
            <div className="max-h-[calc(80vh)] overflow-auto">
              <EvaluationFunctionPane className="h-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
