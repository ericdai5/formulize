import { memo, useCallback, useEffect, useRef } from "react";

import { useReactFlow } from "@xyflow/react";
import { Maximize } from "lucide-react";

interface ContextMenuProps {
  onClose: () => void;
  position: { x: number; y: number };
}

export const CanvasContextMenu = memo(
  ({ onClose, position }: ContextMenuProps) => {
    const { fitView } = useReactFlow();
    const menuRef = useRef<HTMLDivElement>(null);

    const handleFitView = useCallback(() => {
      fitView({ duration: 100, padding: 0.2 });
      onClose();
    }, [fitView, onClose]);

    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    // Close menu on escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onClose();
        }
      };

      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    return (
      <div
        ref={menuRef}
        className="absolute bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-50 min-w-[140px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <button
          onClick={handleFitView}
          className="w-full px-3 py-2 text-left text-sm text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors"
        >
          <Maximize size={14} />
          <span>Fit to View</span>
        </button>
      </div>
    );
  }
);

CanvasContextMenu.displayName = "CanvasContextMenu";
