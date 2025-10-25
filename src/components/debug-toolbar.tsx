import {
  Footprints,
  ListTree,
  ScanEye,
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
  onToggleHoverOutlines: () => void;
  showDebugButton?: boolean;
  showHoverOutlines?: boolean;
  showVariableBorders?: boolean;
}

const Toolbar = ({
  onOpenEvaluationModal,
  onShowElementPane,
  onShowVariableTreePane,
  onShowDebugModal,
  onOpenStoreModal,
  onToggleVariableBorders,
  onToggleHoverOutlines,
  showDebugButton = false,
  showHoverOutlines = false,
  showVariableBorders = false,
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
        isActive={showVariableBorders}
      />
      <IconButton
        icon={ScanEye}
        alt="Toggle Hover Outlines"
        onClick={onToggleHoverOutlines}
        title="Toggle Hover Outlines"
        isActive={showHoverOutlines}
      />
    </div>
  );
};

export default Toolbar;
