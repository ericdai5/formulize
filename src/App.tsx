import { useState } from "react";

import BlockInteractivity from "./BlockInteractivity";
import { Debug } from "./Debug";
import DirectFormulaRenderer from "./DirectFormulaRenderer";
import { Editor } from "./Editor";
import { ElementPane } from "./ElementPane";
import LLMFunction from "./LLMFunction";
import { Menu } from "./Menu";
import { Workspace } from "./Workspace";

function App() {
  const [showDirectRenderer, setShowDirectRenderer] = useState(false);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="bg-blue-600 text-white p-2 flex justify-between items-center">
        <h1 className="font-bold">Formula Editor</h1>
        <button
          className="bg-white text-blue-600 px-3 py-1 rounded text-sm"
          onClick={() => setShowDirectRenderer(!showDirectRenderer)}
        >
          {showDirectRenderer ? "Back to Editor" : "Direct API Example"}
        </button>
      </div>

      {showDirectRenderer ? (
        <div className="p-6 bg-white overflow-auto h-full">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Formula API Example</h1>
            <DirectFormulaRenderer />
          </div>
        </div>
      ) : (
        <div className="flex flex-row w-full h-full">
          <div className="w-[22%] flex flex-col border-r border-gray-200">
            <div className="flex-1 overflow-auto">
              <Editor />
            </div>
            <div className="flex-[0.8] border-t border-gray-200 overflow-auto">
              <LLMFunction />
            </div>
          </div>
          <div className="w-[56%] flex flex-col">
            <div className="flex-1 relative">
              <Menu />
              <Workspace />
            </div>
            <div className="flex-[0.8] border-t border-gray-200 overflow-auto">
              <BlockInteractivity />
            </div>
          </div>
          <div className="w-[22%] h-full border-l border-gray-200">
            <ElementPane />
          </div>
          <Debug />
        </div>
      )}
    </div>
  );
}

export default App;
