import { useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import Toolbar from "../components/debug-toolbar.tsx";
// import EvaluationFunctionPane from "../components/evaluation-function";
import { FormulaTreePane } from "../components/formula-tree-pane.tsx";
import DebugModal from "../components/interpreter.tsx";
import { MathJaxTreePane } from "../components/mathjax-tree-pane.tsx";
import Modal from "../components/modal.tsx";
import StorePane from "../components/variable-overview.tsx";
import { VariableTreesPane } from "../components/variable-tree-pane.tsx";
import { Formulize, FormulizeConfig } from "../index.ts";
import { computationStore } from "../store/computation";
import Canvas from "./canvas.tsx";

interface FormulizeProps {
  formulizeConfig?: FormulizeConfig;
  onRenderError?: (error: string | null) => void;
}

const FormulaCanvas = observer(
  ({ formulizeConfig, onRenderError }: FormulizeProps) => {
    const [currentConfig, setCurrentConfig] = useState<FormulizeConfig | null>(
      formulizeConfig || null
    );
    const [error, setError] = useState<string | null>(null);
    const [showStoreModal, setShowStoreModal] = useState<boolean>(false);
    // const [showEvaluationModal, setShowEvaluationModal] =
    //   useState<boolean>(false);
    const [showElementPane, setShowElementPane] = useState<boolean>(false);
    const [showVariableTreePane, setShowVariableTreePane] =
      useState<boolean>(false);
    const [showDebugModal, setShowDebugModal] = useState<boolean>(false);
    const [showMathJaxTreePane, setShowMathJaxTreePane] =
      useState<boolean>(false);
    const [configKey, setConfigKey] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Update config when formulizeConfig prop changes
    useEffect(() => {
      if (formulizeConfig) {
        // Clear displayedFormulas immediately to prevent stale data from previous config
        computationStore.setDisplayedFormulas([]);
        setCurrentConfig(formulizeConfig);
        setConfigKey((prev) => prev + 1);
      } else {
        setCurrentConfig(null);
      }
    }, [formulizeConfig]);

    // Create formula when config is available
    useEffect(() => {
      if (currentConfig) {
        const createFormula = async () => {
          try {
            setError(null);

            // Update computation engine if specified
            if (currentConfig.semantics?.engine) {
              computationStore.engine = currentConfig.semantics.engine;
            }

            // Create the formula with the config
            await Formulize.create(currentConfig);
          } catch (error) {
            console.error("Error creating formula:", error);
            const errorMessage = `Failed to create formula: ${error instanceof Error ? error.message : String(error)}`;
            setError(errorMessage);
          }
        };

        createFormula();
      } else {
        setError(null);
      }
    }, [currentConfig]);

    // Notify parent of error changes
    useEffect(() => {
      if (onRenderError) {
        onRenderError(error);
      }
    }, [error, onRenderError]);

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

    /**
     * Open MathJax HTML structure inspector modal
     */
    const handleInspectMathJax = () => {
      setShowMathJaxTreePane(true);
    };

    return (
      <div className="formula-renderer overflow-hidden w-full h-full border-r border-slate-200">
        <div className="flex flex-col w-full h-full relative">
          <Toolbar
            // onOpenEvaluationModal={handleOpenEvaluationModal}
            onShowElementPane={() => setShowElementPane(true)}
            onShowVariableTreePane={() => setShowVariableTreePane(true)}
            onShowDebugModal={() => setShowDebugModal(true)}
            onOpenStoreModal={handleOpenStoreModal}
            onToggleVariableBorders={() =>
              (computationStore.showVariableBorders =
                !computationStore.showVariableBorders)
            }
            onToggleHoverOutlines={() =>
              (computationStore.showHoverOutlines =
                !computationStore.showHoverOutlines)
            }
            onToggleExpressionNodes={() =>
              (computationStore.showExpressionNodes =
                !computationStore.showExpressionNodes)
            }
            onInspectMathJax={handleInspectMathJax}
            showDebugButton={isStepMode}
            showHoverOutlines={computationStore.showHoverOutlines}
            showVariableBorders={computationStore.showVariableBorders}
            showExpressionNodes={computationStore.showExpressionNodes}
          />
          <div
            ref={containerRef}
            className="interactive-formula-container w-full h-full overflow-auto"
          >
            <div className="min-w-0 w-full h-full overflow-auto bg-slate-50 text-center">
              <Canvas
                key={configKey}
                controls={currentConfig?.controls}
                environment={currentConfig || undefined}
              />
            </div>
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
        {/* <Modal
          isOpen={showEvaluationModal}
          onClose={() => setShowEvaluationModal(false)}
          title="Evaluation Function"
          maxWidth="max-w-4xl"
        >
          <EvaluationFunctionPane className="h-full" />
        </Modal> */}
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
        {/* MathJax Tree Pane Modal */}
        <Modal
          isOpen={showMathJaxTreePane}
          onClose={() => setShowMathJaxTreePane(false)}
          title="MathJax HTML Structure"
          maxWidth="max-w-3xl"
        >
          <MathJaxTreePane />
        </Modal>
      </div>
    );
  }
);

export default FormulaCanvas;
