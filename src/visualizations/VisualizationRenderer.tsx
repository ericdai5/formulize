import React, { useEffect, useState } from "react";

import { FormulizeVisualization } from "../api";
import { IPlot2D, IPlot3D } from "../api";
import { computationStore } from "../computation";
import Plot2D from "./Plot2D";
import Plot3D from "./Plot3D";

interface VisualizationRendererProps {
  visualization: FormulizeVisualization;
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({
  visualization,
}) => {
  // Force re-renders when visualization config changes by using a key state
  const [renderKey, setRenderKey] = useState(Date.now());

  // Update render key when visualization config changes
  useEffect(() => {
    console.log("🔄 Visualization configuration changed, forcing re-render");
    setRenderKey(Date.now());
  }, [visualization.type, JSON.stringify(visualization.config)]);

  if (visualization.type === "plot2d") {
    const config = visualization.config as IPlot2D;
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
            <div className="flex text-sm text-gray-600 space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                <span>Function curve</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                <span>Current value</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded text-sm text-blue-700">
          {(() => {
            const formula = computationStore.formula;
            const formulaMatch = formula?.match(/^\s*([A-Za-z])\s*=/);
            const formulaDepVar = formulaMatch ? formulaMatch[1] : null;
            if (formulaDepVar && formulaDepVar !== config.yAxis.variable) {
              return (
                <p className="mt-2 text-amber-600">
                  Formula uses variable "{formulaDepVar}" but graph is
                  configured for "{config.yAxis.variable}". The plot will adapt
                  to show the correct data.
                </p>
              );
            }
            return null;
          })()}
        </div>

        {/* Use render key to force complete re-creation of Plot2D component when config changes */}
        <div className="flex items-center justify-center h-full">
          <Plot2D key={`plot2d-${renderKey}`} config={config} />
        </div>
      </div>
    );
  }

  if (visualization.type === "plot3d") {
    const config = visualization.config as IPlot3D;
    return (
      <div
        className="visualization-container p-6 overflow-hidden border-b border-slate-200"
        key={`plot3d-container-${renderKey}`}
      >
        <div className="visualization-header mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-gray-800">
                {config.title || "3D Plot Visualization"}
              </h4>
            </div>
            <div className="flex text-sm text-gray-600 space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
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
      Unsupported visualization type: {visualization.type}
    </div>
  );
};

export default VisualizationRenderer;
