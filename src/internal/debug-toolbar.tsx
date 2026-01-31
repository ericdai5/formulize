import {
  Code2,
  Footprints,
  ListTree,
  ScanEye,
  SquareFunction,
  Variable,
  Vault,
} from "lucide-react";

import IconButton from "../ui/icon-button";

interface ToolbarProps {
  onOpenEvaluationModal?: () => void;
  onShowElementPane: () => void;
  onShowVariableTreePane: () => void;
  onShowDebugModal: () => void;
  onOpenStoreModal: () => void;
  onToggleVariableBorders: () => void;
  onToggleHoverOutlines: () => void;
  onToggleExpressionNodes: () => void;
  onInspectMathJax: () => void;
  showDebugButton?: boolean;
  showHoverOutlines?: boolean;
  showVariableBorders?: boolean;
  showExpressionNodes?: boolean;
}

const Toolbar = ({
  onOpenEvaluationModal,
  onShowElementPane,
  onShowVariableTreePane,
  onShowDebugModal,
  onOpenStoreModal,
  onToggleVariableBorders,
  onToggleHoverOutlines,
  onToggleExpressionNodes,
  onInspectMathJax,
  showDebugButton = false,
  showHoverOutlines = false,
  showVariableBorders = false,
  showExpressionNodes = false,
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
        svgIcon="/show-var-node.svg"
        alt="Toggle Variable Borders"
        onClick={onToggleVariableBorders}
        title="Toggle Variable Borders"
        isActive={showVariableBorders}
      />
      <IconButton
        svgIcon="/show-expression-node.svg"
        alt="Toggle Expression Nodes"
        onClick={onToggleExpressionNodes}
        title="Toggle Expression Nodes"
        isActive={showExpressionNodes}
      />
      <IconButton
        icon={ScanEye}
        alt="Toggle Hover Outlines"
        onClick={onToggleHoverOutlines}
        title="Toggle Hover Outlines"
        isActive={showHoverOutlines}
      />
      <IconButton
        icon={Code2}
        alt="Inspect MathJax HTML"
        onClick={onInspectMathJax}
        title="Inspect MathJax HTML Structure"
      />
    </div>
  );
};

export default Toolbar;
