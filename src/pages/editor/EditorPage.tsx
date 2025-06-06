import BlockInteractivity from "../../formula/BlockInteractivity";
import { Debug } from "./Debug";
import { Editor } from "./Editor";
import { ElementPane } from "./ElementPane";
import LLMFunction from "./LLMFunction";
import { Menu } from "./Menu";
import { Workspace } from "./Workspace";

function EditorPage() {
  return (
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
  );
}

export default EditorPage;
