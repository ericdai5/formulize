import { useEffect, useState } from "react";

import { AugmentedFormula } from "./FormulaTree";
import { FormulizeConfig } from "./api";
import Header from "./components/Header";
import { computationStore } from "./computation";
import APIPage from "./pages/APIPage";
import EditorPage from "./pages/EditorPage";
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

  // Reset all formula state when switching to API examples or symbolic algebra test
  useEffect(() => {
    if (viewMode !== "editor") {
      // Clear formula store
      formulaStore.updateFormula(new AugmentedFormula([]));

      // Clear any saved Formulize config
      if (window.__lastFormulizeConfig) {
        delete window.__lastFormulizeConfig;
      }

      // Reset computation store variables
      computationStore.variables.clear();
      computationStore.formula = "";
      computationStore.setLastGeneratedCode(null);
      computationStore.setFormulaError(null);
      computationStore.variableTypesChanged = 0;
    }
  }, [viewMode]);

  return (
    <div className="flex flex-col w-full h-full">
      <Header viewMode={viewMode} setViewMode={setViewMode} />
      {viewMode === "formulizeAPI" ? (
        <APIPage />
      ) : viewMode === "editor" ? (
        <EditorPage />
      ) : null}
    </div>
  );
}

export default App;
