import { observer } from "mobx-react-lite";

import { GripHorizontal, GripVertical } from "lucide-react";

import VisualizationRenderer from "../../visualizations/visualization";

// Custom Visualization Node Component
const VisualizationNode = observer(({ data }: { data: any }) => {
  const { visualization } = data;

  if (!visualization) {
    return (
      <div className="visualization-node border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-slate-500 text-sm">No visualization available</div>
      </div>
    );
  }

  return (
    <div className="visualization-node border border-slate-200 rounded-3xl p-2 min-w-[400px] relative group bg-white">
      {/* Top Handle */}
      <div className="visualization-drag-handle absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-1 py-0.5 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripHorizontal size={14} className="text-slate-400" />
      </div>
      {/* Bottom Handle */}
      <div className="visualization-drag-handle absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-1 py-0.5 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripHorizontal size={14} className="text-slate-400" />
      </div>
      {/* Left Handle */}
      <div className="visualization-drag-handle absolute top-1/2 -left-3 transform -translate-y-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-0.5 py-1 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripVertical size={14} className="text-slate-400" />
      </div>
      {/* Right Handle */}
      <div className="visualization-drag-handle absolute top-1/2 -right-3 transform -translate-y-1/2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md px-0.5 py-1 cursor-move z-20 opacity-0 group-hover:opacity-100">
        <GripVertical size={14} className="text-slate-400" />
      </div>
      <div className="nodrag rounded-2xl">
        <VisualizationRenderer visualization={visualization} />
      </div>
    </div>
  );
});

export default VisualizationNode;
