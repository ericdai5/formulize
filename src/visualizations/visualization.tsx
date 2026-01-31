import React, { useEffect, useState } from "react";

import { FormulizeConfig } from "..";
import { IVisualization } from "../types/visualization";
import Canvas from "./custom/canvas";
import Plot2D from "./plot2d/plot-2d";
import Plot3D from "./plot3d/plot-3d";

const PlotWrapper: React.FC<{
  title?: string;
  renderKey: number;
  className?: string;
  children: React.ReactNode;
}> = ({ title, renderKey, className = "", children }) => (
  <div
    className={`w-full h-full p-6 overflow-hidden ${className}`}
    key={`plot-container-${renderKey}`}
  >
    {title && (
      <div className="visualization-header mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-medium text-gray-800">{title}</h4>
          </div>
        </div>
      </div>
    )}
    <div className="flex items-center justify-center h-full">{children}</div>
  </div>
);

const VisualizationRenderer: React.FC<{
  visualization: IVisualization;
  environment?: FormulizeConfig;
}> = ({ visualization, environment }) => {
  const [renderKey, setRenderKey] = useState(Date.now());
  const configString = JSON.stringify(visualization);
  useEffect(() => {
    setRenderKey(Date.now());
  }, [visualization.type, configString]);

  if (visualization.type === "plot2d") {
    return (
      <PlotWrapper title={visualization.title} renderKey={renderKey}>
        <Plot2D key={`plot2d-${renderKey}`} config={visualization} />
      </PlotWrapper>
    );
  }

  if (visualization.type === "plot3d") {
    return (
      <PlotWrapper title={visualization.title} renderKey={renderKey}>
        <Plot3D
          key={`plot3d-${renderKey}`}
          config={visualization}
          environment={environment}
        />
      </PlotWrapper>
    );
  }

  if (visualization.type === "custom") {
    return <Canvas key={`custom-${renderKey}`} config={visualization} />;
  }

  return (
    <div className="p-4 bg-red-100 text-red-700 rounded-lg">
      Unsupported visualization type: {(visualization as { type: string }).type}
    </div>
  );
};

export default VisualizationRenderer;
