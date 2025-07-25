import { useEffect, useState } from "react";

import { AugmentedFormula } from "./FormulaTree";
import { FormulizeConfig } from "./api";
import Header from "./components/navigation.tsx";
import APIPage from "./pages/api/index.tsx";
import EditorPage from "./pages/editor/EditorPage";
import { formulaStore } from "./store";
import { computationStore } from "./store/computation";

// Ensure TypeScript knows about the global configuration property
declare global {
  interface Window {
    __lastFormulizeConfig?: FormulizeConfig;
  }
}

function App() {
  // View mode: "editor" (default) or "formulizeAPI"
  const [viewMode, setViewMode] = useState<"editor" | "formulizeAPI">(
    "formulizeAPI"
  );

  // Reset all formula state when switching to API examples or symbolic algebra test
  useEffect(() => {
    if (viewMode !== "editor") {
      // Clear formula store
      formulaStore.updateFormula(new AugmentedFormula([]));

      // Reset computation store variables
      computationStore.variables.clear();
      computationStore.setLastGeneratedCode(null);
      computationStore.variableTypesChanged = 0;
    }
  }, [viewMode]);

  return (
    <div className="flex flex-col w-full h-full">
      {/* TODO: This is the old nav, with a side bar with access to the formula forge editor, if we want to add it back, we need to make the forge work with the new formulize system because currently the forge is not working*/}
      {/* <Header viewMode={viewMode} setViewMode={setViewMode} /> */}
      {viewMode === "formulizeAPI" ? (
        <APIPage />
      ) : viewMode === "editor" ? (
        <EditorPage />
      ) : null}
    </div>
  );
}

export default App;
