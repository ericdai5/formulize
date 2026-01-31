import React, { useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { IVisualization } from "../types/visualization";
import VisualizationRenderer from "../visualizations/visualization";
import { useFormulize } from "./hooks";

interface VisualizationComponentProps {
  type: "plot2d" | "plot3d" | "custom";
  config: IVisualization;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

export const VisualizationComponent: React.FC<VisualizationComponentProps> =
  observer(({ config, className = "", style = {} }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const context = useFormulize();
    const computationStore = context?.computationStore;
    const isLoading = context?.isLoading ?? true;
    const instance = context?.instance;

    useEffect(() => {
      // Wait for Formulize to be ready
      if (isLoading || !instance || !computationStore) return;

      // Ensure computation store is initialized
      if (computationStore.variables.size > 0) {
        setIsReady(true);
      } else {
        // Wait for variables to be initialized
        const checkInterval = setInterval(() => {
          if (computationStore.variables.size > 0) {
            setIsReady(true);
            clearInterval(checkInterval);
          }
        }, 100);

        return () => clearInterval(checkInterval);
      }
    }, [computationStore, isLoading, instance]);

    const containerStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      border: "1px solid #e2e8f0",
      borderRadius: "0.5rem",
      overflow: "hidden",
      backgroundColor: "#ffffff",
      ...style,
    };

    return (
      <div
        ref={containerRef}
        className={`visualization-component ${className}`}
        style={containerStyle}
      >
        {!isReady ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading visualization...
          </div>
        ) : (
          <VisualizationRenderer visualization={config} />
        )}
      </div>
    );
  });

export default VisualizationComponent;
