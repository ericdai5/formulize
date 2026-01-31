import { useMemo, useState } from "react";

import {
  FormulizeContext,
  FormulizeContextValue,
} from "../../core/hooks";
import Canvas from "../../internal/canvas";
import { createComputationStore } from "../../store/computation";
import { createExecutionStore } from "../../store/execution";
import { Debug } from "./Debug";
import { Editor } from "./Editor";
import { ElementPane } from "./ElementPane";
import { Menu } from "./Menu";
import { Workspace } from "./Workspace";

function EditorPage() {
  // Create scoped stores for this page
  const [computationStore] = useState(() => createComputationStore());
  const [executionStore] = useState(() => createExecutionStore());

  // Create context value for all children
  const contextValue: FormulizeContextValue = useMemo(
    () => ({
      instance: null,
      config: null,
      isLoading: false,
      error: null,
      computationStore,
      executionStore,
      reinitialize: () => {},
    }),
    [computationStore, executionStore]
  );

  return (
    <FormulizeContext.Provider value={contextValue}>
      <div className="flex flex-row w-full h-full">
        <div className="w-[22%] flex flex-col border-r border-gray-200">
          <div className="flex-1 overflow-auto">
            <Editor />
          </div>
        </div>
        <div className="w-[56%] flex flex-col">
          <div className="flex-1 relative">
            <Menu />
            <Workspace />
          </div>
          <div className="flex-[0.8] border-t border-gray-200 overflow-auto">
            <Canvas
              computationStore={computationStore}
              executionStore={executionStore}
            />
          </div>
        </div>
        <div className="w-[22%] h-full border-l border-gray-200">
          <ElementPane />
        </div>
        <Debug />
      </div>
    </FormulizeContext.Provider>
  );
}

export default EditorPage;
