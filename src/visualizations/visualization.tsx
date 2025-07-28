import React, { useEffect, useState } from "react";

import { FormulizeConfig } from "..";
import { IVisualization } from "../types/visualization";
import Canvas from "./custom/canvas";
import Plot2D from "./plot2d/Plot2D";
import Plot3D from "./plot3d/Plot3D";

const VisualizationRenderer: React.FC<{
  visualization: IVisualization;
  environment?: FormulizeConfig;
}> = ({ visualization, environment }) => {
  // 1. Force re-renders when visualization config changes by using a key state
  // 2. Extract complex expression to a variable for useEffect dependency
  // 3. Use useEffect to update render key when visualization config changes
  const [renderKey, setRenderKey] = useState(Date.now());
  const configString = JSON.stringify(visualization);
  useEffect(() => {
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
        className="p-6 w-full h-full overflow-hidden border-b"
        key={`plot3d-container-${renderKey}`}
      >
        <div className="visualization-header mb-3">
          <h4 className="text-lg font-medium text-gray-800">
            {config.title || "3D Plot Visualization"}
          </h4>
        </div>

        {/* Use render key to force complete re-creation of Plot3D component when config changes */}
        <div className="flex items-center justify-center h-full">
          <Plot3D
            key={`plot3d-${renderKey}`}
            config={config}
            environment={environment}
          />
        </div>
      </div>
    );
  }

  if (visualization.type === "custom") {
    const config = visualization;
    return <Canvas key={`custom-${renderKey}`} config={config} />;
  }

  return (
    <div className="p-4 bg-red-100 text-red-700 rounded-lg">
      Unsupported visualization type: {(visualization as { type: string }).type}
    </div>
  );
};

export default VisualizationRenderer;
