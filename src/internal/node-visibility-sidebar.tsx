import React from "react";

import { X } from "lucide-react";

import Switch from "../ui/switch";

interface NodeVisibilitySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleVariableBorders: () => void;
  onToggleFormulaNodeBorders: () => void;
  onToggleLabelNodeBorders: () => void;
  onToggleExpressionBorders: () => void;
  onToggleStepBorders: () => void;
  onToggleFormulaNodeShadow: () => void;
  onToggleLabelNodeShadow: () => void;
  onToggleVariableShadow: () => void;
  onToggleExpressionShadow: () => void;
  onToggleStepShadow: () => void;
  showFormulaBorders?: boolean;
  showLabelBorders?: boolean;
  showVariableBorders?: boolean;
  showExpressionBorders?: boolean;
  showStepBorders?: boolean;
  showFormulaShadow?: boolean;
  showLabelShadow?: boolean;
  showVariableShadow?: boolean;
  showExpressionShadow?: boolean;
  showStepShadow?: boolean;
}

const NodeVisibilitySidebar: React.FC<NodeVisibilitySidebarProps> = ({
  isOpen,
  onClose,
  onToggleVariableBorders,
  onToggleFormulaNodeBorders,
  onToggleLabelNodeBorders,
  onToggleExpressionBorders,
  onToggleStepBorders,
  onToggleFormulaNodeShadow,
  onToggleLabelNodeShadow,
  onToggleVariableShadow,
  onToggleExpressionShadow,
  onToggleStepShadow,
  showFormulaBorders = false,
  showLabelBorders = false,
  showVariableBorders = false,
  showExpressionBorders = false,
  showStepBorders = false,
  showFormulaShadow = false,
  showLabelShadow = false,
  showVariableShadow = false,
  showExpressionShadow = false,
  showStepShadow = false,
}) => {
  return (
    <div
      className={`h-full bg-white flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? "w-64 border-l border-slate-200" : "w-0"
      } overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 min-w-64">
        <h3 className="text-base font-medium text-slate-900">
          Node Visibility
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-w-64">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Borders
          </p>
          <Switch
            icon={<img src="/show-var-border.svg" alt="" className="w-4 h-4" />}
            label="Variable"
            onToggle={onToggleVariableBorders}
            isActive={showVariableBorders}
          />
          <Switch
            icon={
              <img
                src="/show-expression-border.svg"
                alt=""
                className="w-4 h-4"
              />
            }
            label="Expression"
            onToggle={onToggleExpressionBorders}
            isActive={showExpressionBorders}
          />
          <Switch
            icon={
              <img src="/show-formula-border.svg" alt="" className="w-4 h-4" />
            }
            label="Formula"
            onToggle={onToggleFormulaNodeBorders}
            isActive={showFormulaBorders}
          />
          <Switch
            icon={
              <img src="/show-label-border.svg" alt="" className="w-4 h-4" />
            }
            label="Label"
            onToggle={onToggleLabelNodeBorders}
            isActive={showLabelBorders}
          />
          <Switch
            icon={
              <img src="/show-step-border.svg" alt="" className="w-4 h-4" />
            }
            label="Step"
            onToggle={onToggleStepBorders}
            isActive={showStepBorders}
          />
        </div>
        <div className="mt-6">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Shadows
          </p>
          <Switch
            icon={<img src="/show-var-shadow.svg" alt="" className="w-4 h-4" />}
            label="Variable"
            onToggle={onToggleVariableShadow}
            isActive={showVariableShadow}
          />
          <Switch
            icon={
              <img
                src="/show-expression-shadow.svg"
                alt=""
                className="w-4 h-4"
              />
            }
            label="Expression"
            onToggle={onToggleExpressionShadow}
            isActive={showExpressionShadow}
          />
          <Switch
            icon={
              <img src="/show-formula-shadow.svg" alt="" className="w-4 h-4" />
            }
            label="Formula"
            onToggle={onToggleFormulaNodeShadow}
            isActive={showFormulaShadow}
          />
          <Switch
            icon={
              <img src="/show-label-shadow.svg" alt="" className="w-4 h-4" />
            }
            label="Label"
            onToggle={onToggleLabelNodeShadow}
            isActive={showLabelShadow}
          />
          <Switch
            icon={
              <img src="/show-step-shadow.svg" alt="" className="w-4 h-4" />
            }
            label="Step"
            onToggle={onToggleStepShadow}
            isActive={showStepShadow}
          />
        </div>
      </div>
    </div>
  );
};

export default NodeVisibilitySidebar;
