import {
  Code,
  Footprints,
  ListTree,
  SquareFunction,
  Variable,
  Vault,
} from "lucide-react";

import IconButton from "./icon-button";

interface ToolbarProps {
  onToggleRender: () => void;
  onOpenEvaluationModal?: () => void;
  onShowElementPane: () => void;
  onShowVariableTreePane: () => void;
  onShowDebugModal: () => void;
  onOpenStoreModal: () => void;
  showDebugButton?: boolean;
}

const Toolbar = ({
  onToggleRender,
  onOpenEvaluationModal,
  onShowElementPane,
  onShowVariableTreePane,
  onShowDebugModal,
  onOpenStoreModal,
  showDebugButton = false,
}: ToolbarProps) => {
  return (
    <div className="absolute right-4 top-4 gap-3 flex flex-row z-20">
      <IconButton icon={Code} alt="Edit" onClick={onToggleRender} />
      {onOpenEvaluationModal && (
        <IconButton
          icon={SquareFunction}
          alt="Open Evaluation"
          onClick={onOpenEvaluationModal}
        />
      )}
      <IconButton
        icon={ListTree}
        alt="Show Elements"
        onClick={onShowElementPane}
        title="Show Elements"
      />
      <IconButton
        icon={Variable}
        alt="Show Variable Trees"
        onClick={onShowVariableTreePane}
        title="Show Variable Trees"
      />
      {showDebugButton && (
        <IconButton
          icon={Footprints}
          alt="Debug Manual Functions"
          onClick={onShowDebugModal}
          title="Debug Manual Functions"
        />
      )}
      <IconButton icon={Vault} alt="Store" onClick={onOpenStoreModal} />
    </div>
  );
};

export default Toolbar;
