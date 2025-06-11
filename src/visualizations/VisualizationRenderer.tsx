import React, { useEffect, useState } from "react";

import { IVisualization } from "../types/visualization";
import Plot2D from "./plot2d/Plot2D";
import Plot3D from "./plot3d/Plot3D";

interface VisualizationRendererProps {
  visualization: IVisualization;
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({
  visualization,
}) => {
  // 1. Force re-renders when visualization config changes by using a key state
  // 2. Extract complex expression to a variable for useEffect dependency
  // 3. Use useEffect to update render key when visualization config changes
  const [renderKey, setRenderKey] = useState(Date.now());
  const configString = JSON.stringify(visualization);
  useEffect(() => {
    console.log("Visualization config changed, forcing re-render");
    setRenderKey(Date.now());
  }, [visualization.type, configString]);

  if (visualization.type === "plot2d") {
    const config = visualization;
    return (
      <div
        className="visualization-container w-full h-full p-6 overflow-hidden"
        key={`plot-container-${renderKey}`}
      >
        <div className="visualization-header mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-gray-800">
                {config.title || "Plot Visualization"}
              </h4>
            </div>
            <div className="flex text-sm text-gray-600 space-x-4 border border-slate-200 rounded-xl h-9 px-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                <span>Function curve</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <span>Current value</span>
              </div>
            </div>
          </div>
        </div>
        {/* Use render key to force complete re-creation of Plot2D component when config changes */}
        <div className="flex items-center justify-center h-full">
          <Plot2D key={`plot2d-${renderKey}`} config={config} />
        </div>
      </div>
    );
  }

  if (visualization.type === "plot3d") {
    const config = visualization;
    return (
      <div
        className="visualization-container p-6 overflow-hidden border-b border-slate-200"
        key={`plot3d-container-${renderKey}`}
      >
        <div className="visualization-header mb-3">
          <div className="flex items-center justify-between ">
            <h4 className="text-lg font-medium text-gray-800">
              {config.title || "3D Plot Visualization"}
            </h4>
            <div className="flex text-sm text-gray-600 space-x-4 border border-slate-200 rounded-xl h-9 px-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                <span>Current point</span>
              </div>
            </div>
          </div>
        </div>

        {/* Use render key to force complete re-creation of Plot3D component when config changes */}
        <div className="flex items-center justify-center h-full">
          <Plot3D key={`plot3d-${renderKey}`} config={config} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-100 text-red-700 rounded-lg">
      Unsupported visualization type: {(visualization as any).type}
    </div>
  );
};

export default VisualizationRenderer;
