import {
  Footprints,
  ListTree,
  SquareDashed,
  SquareFunction,
  Variable,
  Vault,
} from "lucide-react";

import IconButton from "./icon-button";

interface ToolbarProps {
  onOpenEvaluationModal?: () => void;
  onShowElementPane: () => void;
  onShowVariableTreePane: () => void;
  onShowDebugModal: () => void;
  onOpenStoreModal: () => void;
  onToggleVariableBorders: () => void;
  showDebugButton?: boolean;
}

const Toolbar = ({
  onOpenEvaluationModal,
  onShowElementPane,
  onShowVariableTreePane,
  onShowDebugModal,
  onOpenStoreModal,
  onToggleVariableBorders,
  showDebugButton = false,
}: ToolbarProps) => {
  return (
    <div className="absolute right-4 top-4 gap-3 flex flex-row z-20">
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
      <IconButton
        icon={SquareDashed}
        alt="Toggle Variable Borders"
        onClick={onToggleVariableBorders}
        title="Toggle Variable Borders"
      />
    </div>
  );
};

export default Toolbar;
