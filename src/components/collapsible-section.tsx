import React from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isCollapsed,
  onToggleCollapse,
  children,
  headerContent,
  className = "",
  headerClassName = "",
  contentClassName = "",
}) => {
  return (
    <div
      className={`flex flex-col ${isCollapsed ? "" : "flex-1 min-h-0"} ${className}`}
    >
      <div
        className={`px-4 py-2 bg-white font-medium flex flex-row justify-between border-b border-slate-200"
        } ${headerClassName}`}
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {headerContent}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
      {!isCollapsed && (
        <div
          className={`flex-1 overflow-y-auto h-0 border-b border-slate-200 ${contentClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
