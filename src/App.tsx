import { useEffect, useState } from "react";

import { AugmentedFormula } from "./FormulaTree";
import { FormulizeConfig } from "./api";
import { computationStore } from "./api/computation";
import Header from "./components/Header";
import APIPage from "./pages/api/index.tsx";
import EditorPage from "./pages/editor/EditorPage";
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
      computationStore.setLastGeneratedCode(null);
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
