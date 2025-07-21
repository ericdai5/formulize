import { useEffect, useState } from "react";

import { FormulizeConfig } from "../../api/Formulize";
import { computationStore } from "../../api/computation";
import EvaluationFunctionPane from "../../components/evaluation-function";
import Modal from "../../components/modal";
import StorePane from "../../components/variable-overview";
import FormulaCanvas from "../../rendering/formula-canvas";
import VisualizationRenderer from "../../visualizations/VisualizationRenderer";

export default function APIPage() {
  const [currentFormulaConfig, setCurrentFormulaConfig] = useState<
    FormulizeConfig | undefined
  >(undefined);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

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
              setCurrentFormulaConfig(config);
            }}
            onOpenEvaluationModal={() => setIsEvaluationModalOpen(true)}
            onOpenStoreModal={() => setIsStoreModalOpen(true)}
          />
        </div>
        {currentFormulaConfig?.visualizations &&
          currentFormulaConfig?.visualizations?.length && (
            <div className="w-1/2 h-full overflow-auto">
              {currentFormulaConfig?.visualizations?.map(
                (visualization, index) => (
                  <VisualizationRenderer
                    key={`viz-${index}`}
                    visualization={visualization}
                  />
                )
              )}
            </div>
          )}
      </div>

      {/* Evaluation Modal */}
      <Modal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        title="Evaluation Function"
        maxWidth="max-w-4xl"
      >
        <EvaluationFunctionPane className="h-full" />
      </Modal>

      {/* Store Modal */}
      <Modal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        title="Computation Store Variables"
        maxWidth="max-w-2xl"
      >
        <StorePane className="h-full" />
      </Modal>
    </div>
  );
}
