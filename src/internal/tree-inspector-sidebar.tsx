import React, { useState } from "react";

import { X } from "lucide-react";

import { FormulizeConfig } from "../formulize";
import { FormulaTreePane } from "./formula-tree-pane";
import { MathJaxTreePane } from "./mathjax-tree-pane";
import { VariableTreesPane } from "./variable-tree-pane";

interface TreeInspectorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  config: FormulizeConfig | null;
}

type TabType = "formula" | "variables" | "mathjax";

const TreeInspectorSidebar: React.FC<TreeInspectorSidebarProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("formula");

  return (
    <div
      className={`h-full bg-white border-l border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? "w-80" : "w-0"
      } overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 min-w-80">
        <h3 className="text-base font-medium text-slate-900">Latex Tree</h3>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 min-w-80">
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "formula"
              ? "text-slate-900 border-b-2 border-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("formula")}
        >
          Formula
        </button>
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "variables"
              ? "text-slate-900 border-b-2 border-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("variables")}
        >
          Variables
        </button>
        <button
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "mathjax"
              ? "text-slate-900 border-b-2 border-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => setActiveTab("mathjax")}
        >
          MathJax
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-w-80">
        {activeTab === "formula" && <FormulaTreePane />}
        {activeTab === "variables" && <VariableTreesPane config={config} />}
        {activeTab === "mathjax" && <MathJaxTreePane />}
      </div>
    </div>
  );
};

export default TreeInspectorSidebar;
