import { useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { FormulizeProvider } from "../components/FormulizeProvider.tsx";
import Toolbar from "../components/debug-toolbar.tsx";
import { FormulaTreePane } from "../components/formula-tree-pane.tsx";
import DebugModal from "../components/interpreter.tsx";
import { MathJaxTreePane } from "../components/mathjax-tree-pane.tsx";
import Modal from "../components/modal.tsx";
import { useFormulize } from "../components/useFormulize.ts";
import StorePane from "../components/variable-overview.tsx";
import { VariableTreesPane } from "../components/variable-tree-pane.tsx";
import { FormulizeConfig } from "../index.ts";
import Canvas from "./canvas.tsx";

interface FormulizeProps {
  formulizeConfig?: FormulizeConfig;
  onRenderError?: (error: string | null) => void;
}

/**
 * Inner component that renders the formula canvas and debug tools.
 * Gets stores from FormulizeProvider context.
 */
const FormulaCanvasInner = observer(
  ({ onRenderError }: { onRenderError?: (error: string | null) => void }) => {
    const context = useFormulize();
    const [showStoreModal, setShowStoreModal] = useState<boolean>(false);
    const [showElementPane, setShowElementPane] = useState<boolean>(false);
    const [showVariableTreePane, setShowVariableTreePane] =
      useState<boolean>(false);
    const [showDebugModal, setShowDebugModal] = useState<boolean>(false);
    const [showMathJaxTreePane, setShowMathJaxTreePane] =
      useState<boolean>(false);
    const [configKey, setConfigKey] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevConfigRef = useRef<FormulizeConfig | null>(null);
    const computationStore = context?.computationStore;
    const executionStore = context?.executionStore;
    const currentConfig = context?.config;
    const error = context?.error ?? null;

    // Update configKey when config changes to force re-render of Canvas
    useEffect(() => {
      if (currentConfig && currentConfig !== prevConfigRef.current) {
        prevConfigRef.current = currentConfig;
        setConfigKey((prev) => prev + 1);
      }
    }, [currentConfig]);

    // Notify parent of error changes
    useEffect(() => {
      if (onRenderError) {
        onRenderError(error);
      }
    }, [error, onRenderError]);

    // Close debug modal when step mode is no longer available
    const isStepMode = computationStore?.isStepMode() ?? false;
    useEffect(() => {
      if (showDebugModal && !isStepMode) {
        setShowDebugModal(false);
      }
    }, [showDebugModal, isStepMode]);

    // Guard: context must be available
    if (!context || !computationStore || !executionStore) {
      return (
        <div className="formula-renderer overflow-hidden w-full h-full border-r border-slate-200 flex items-center justify-center">
          <div className="text-slate-500">Loading...</div>
        </div>
      );
    }

    return (
      <div className="formula-renderer overflow-hidden w-full h-full border-r border-slate-200">
        <div className="flex flex-col w-full h-full relative">
          <Toolbar
            onShowElementPane={() => setShowElementPane(true)}
            onShowVariableTreePane={() => setShowVariableTreePane(true)}
            onShowDebugModal={() => setShowDebugModal(true)}
            onOpenStoreModal={() => setShowStoreModal(true)}
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
            onInspectMathJax={() => setShowMathJaxTreePane(true)}
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
                computationStore={computationStore}
                executionStore={executionStore}
              />
            </div>
          </div>
        </div>
        <Modal
          isOpen={showElementPane}
          onClose={() => setShowElementPane(false)}
          title="Formula Elements"
          maxWidth="max-w-md"
        >
          <FormulaTreePane />
        </Modal>
        <Modal
          isOpen={showVariableTreePane}
          onClose={() => setShowVariableTreePane(false)}
          title="Variable Trees"
          maxWidth="max-w-2xl"
        >
          <VariableTreesPane config={currentConfig ?? null} />
        </Modal>
        <Modal
          isOpen={showStoreModal}
          onClose={() => setShowStoreModal(false)}
          title="Computation Store Variables"
          maxWidth="max-w-2xl"
        >
          <StorePane className="h-full" />
        </Modal>
        <DebugModal
          isOpen={showDebugModal}
          onClose={() => setShowDebugModal(false)}
        />
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

/**
 * FormulaCanvas component - wraps content with FormulizeProvider.
 * The provider handles creating the Formulize instance and stores.
 */
const FormulaCanvas: React.FC<FormulizeProps> = ({
  formulizeConfig,
  onRenderError,
}) => {
  return (
    <FormulizeProvider config={formulizeConfig} onError={onRenderError}>
      <FormulaCanvasInner onRenderError={onRenderError} />
    </FormulizeProvider>
  );
};

export default FormulaCanvas;
