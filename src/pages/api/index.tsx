import { useEffect, useState } from "react";

import { FormulizeConfig } from "../../formulize";
import { computationStore } from "../../store/computation";
import TemplateSelector from "../../components/template-selector";
import { examples as formulaExamples } from "../../examples";
import Formulize from "../../rendering/formulize";

export default function APIPage() {
  const [currentFormulaConfig, setCurrentFormulaConfig] = useState<
    FormulizeConfig | undefined
  >(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<
    keyof typeof formulaExamples | undefined
  >("kineticEnergy");

  useEffect(() => {
    if (currentFormulaConfig?.computation?.engine) {
      computationStore.computationEngine =
        currentFormulaConfig.computation.engine;
    }
  }, [currentFormulaConfig?.computation?.engine]);

  return (
    <div className="relative h-full">
      <Formulize
        formulizeConfig={currentFormulaConfig}
        selectedTemplate={selectedTemplate}
        onConfigChange={(config) => {
          setCurrentFormulaConfig(config);
        }}
      />
      <div className="absolute top-4 left-4 z-30">
        <TemplateSelector
          onTemplateSelect={setSelectedTemplate}
          activeTemplate={selectedTemplate}
        />
      </div>
    </div>
  );
}
