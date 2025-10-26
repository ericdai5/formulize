import { memo } from "react";

import { useReactFlow } from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";

// Custom Controls Component - Memoized to prevent unnecessary re-renders
export const CanvasControls = memo(() => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    fitView({ duration: 200, padding: 0.1 });
  };

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
      <button
        onClick={handleZoomIn}
        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:scale-105 transition-all duration-200 shadow-sm"
        title="Zoom In"
      >
        <Plus size={16} />
      </button>

      <button
        onClick={handleZoomOut}
        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:scale-105 transition-all duration-200 shadow-sm"
        title="Zoom Out"
      >
        <Minus size={16} />
      </button>

      <button
        onClick={handleFitView}
        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:scale-105 transition-all duration-200 shadow-sm"
        title="Fit View"
      >
        <Maximize size={16} />
      </button>
    </div>
  );
});

// Simplified controls for FormulaComponent - only resize button
export const SimpleCanvasControls = memo(() => {
  const { fitView } = useReactFlow();
  const handleFitView = () => {
    fitView({ duration: 100, padding: 0.2 });
  };
  return (
    <div className="absolute bottom-2 left-2 z-10">
      <button
        onClick={handleFitView}
        className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:scale-105 transition-all duration-200 shadow-sm"
        title="Fit View"
      >
        <Maximize size={16} />
      </button>
    </div>
  );
});
