import React, { useEffect, useState } from "react";

import { useStore } from "../core/hooks";
import { IGraph2D } from "../types/graph2d";
import { IGraph3D } from "../types/graph3d";
import Plot2D from "./graph2d/graph-2d";
import Plot3D from "./graph3d/graph-3d";

const PlotWrapper: React.FC<{
  renderKey: number;
  className?: string;
  children: React.ReactNode;
}> = ({ renderKey, className = "", children }) => (
  <div
    className={`w-full h-full p-6 overflow-hidden ${className}`}
    key={`plot-container-${renderKey}`}
  >
    <div className="flex items-center justify-center h-full">{children}</div>
  </div>
);

type GraphEnvironment = {
  graph2d?: IGraph2D[];
  graph3d?: IGraph3D[];
};

interface VisualizationRendererProps {
  id: string;
}

type ResolvedGraph =
  | { type: "graph2d"; config: IGraph2D }
  | { type: "graph3d"; config: IGraph3D };

function resolveByExplicitId(
  id: string,
  environment: GraphEnvironment
): ResolvedGraph | null {
  const graph2d = environment.graph2d?.find((graph) => graph.id === id);
  if (graph2d) {
    return { type: "graph2d", config: graph2d };
  }
  const graph3d = environment.graph3d?.find((graph) => graph.id === id);
  if (graph3d) {
    return { type: "graph3d", config: graph3d };
  }
  return null;
}

function resolveGraph(
  id: string,
  environment: GraphEnvironment
): ResolvedGraph | null {
  return resolveByExplicitId(id, environment);
}

const VisualizationRenderer = ({ id }: VisualizationRendererProps) => {
  const storeContext = useStore();
  const sourceEnvironment =
    storeContext?.instance?.environment ?? storeContext?.config ?? {};
  const resolvedGraph = resolveGraph(id, sourceEnvironment);

  const [renderKey, setRenderKey] = useState(Date.now());
  const configString = JSON.stringify(resolvedGraph?.config ?? null);
  useEffect(() => {
    setRenderKey(Date.now());
  }, [id, configString]);

  if (!resolvedGraph) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
        Graph with id "{id}" not found.
      </div>
    );
  }

  if (resolvedGraph.type === "graph2d") {
    return (
      <PlotWrapper renderKey={renderKey}>
        <Plot2D key={`graph2d-${renderKey}`} config={resolvedGraph.config} />
      </PlotWrapper>
    );
  }

  return (
    <PlotWrapper renderKey={renderKey}>
      <Plot3D key={`graph3d-${renderKey}`} config={resolvedGraph.config} />
    </PlotWrapper>
  );
};

export default VisualizationRenderer;
