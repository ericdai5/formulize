import React, { useEffect, useState } from 'react';
import { FormulizeVisualization } from './api';
import Plot2D from './Plot2D';

interface VisualizationRendererProps {
  visualization: FormulizeVisualization;
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ visualization }) => {
  // Force re-renders when visualization config changes by using a key state
  const [renderKey, setRenderKey] = useState(Date.now());

  // Update the render key whenever the visualization config changes
  useEffect(() => {
    console.log("🔄 Visualization configuration changed, forcing re-render");
    setRenderKey(Date.now());
  }, [
    visualization.type,
    JSON.stringify(visualization.config)
  ]);
  
  if (visualization.type === 'plot2d') {
    return (
      <div
        className="visualization-container p-4 bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden"
        key={`plot-container-${renderKey}`}
      >
        <div className="visualization-header mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-gray-800">
                {visualization.config.title || "Plot Visualization"}
              </h4>
              <p className="text-sm text-gray-500">
                Interactive visualization bound to formula variables
              </p>
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

        <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
          <p>
            <strong>Tip:</strong> Click anywhere on the graph to set the {visualization.config.xAxis.variable} variable to that value
          </p>

          {/* Show warning if there might be a mismatch between formula and config variables */}
          {(() => {
            const formula = computationStore.formula;
            const formulaMatch = formula?.match(/^\s*([A-Za-z])\s*=/);
            const formulaDepVar = formulaMatch ? formulaMatch[1] : null;

            if (formulaDepVar && formulaDepVar !== visualization.config.yAxis.variable) {
              return (
                <p className="mt-2 text-amber-600">
                  <strong>Note:</strong> Formula uses variable "{formulaDepVar}" but graph is configured for "{visualization.config.yAxis.variable}".
                  The plot will adapt to show the correct data.
                </p>
              );
            }
            return null;
          })()}
        </div>

        {/* Use the render key to force complete re-creation of the Plot2D component when config changes */}
        <Plot2D
          key={`plot2d-${renderKey}`}
          config={visualization.config}
        />

        <div className="mt-3 text-xs text-gray-500">
          <p>This visualization automatically updates as you change variables in the formula or update the API configuration.</p>
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