import React, { useCallback, useEffect, useMemo, useState } from "react";

import { reaction, runInAction } from "mobx";

import { computationStore } from "../../store/computation";
import { IContext, ICustom } from "../../types/custom";
import {
  getVariableValue,
  updateVariable,
} from "../../util/computation-helpers";
// Import components to trigger self-registration
import "./components";
import { getAllRegistered, getRegistered } from "./registry";

interface CanvasProps {
  config: ICustom;
}

/**
 * Error display component for rendering visualization errors
 */
const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
  <div className="p-4 text-red-700 bg-red-100 rounded-lg">
    <div className="font-semibold">Error:</div>
    <div>{error}</div>
  </div>
);

/**
 * Canvas component for rendering custom visualizations
 * Re-renders when variable values change but avoids infinite loops
 */
const Canvas: React.FC<CanvasProps> = ({ config }) => {
  const [variables, setVariables] = useState<Record<string, number>>({});
  const { component, update = {} } = config;

  // Create stable callback functions
  const updateVariableCallback = useCallback(
    (variableName: string, value: number) => {
      try {
        if (computationStore.variables.has(variableName)) {
          runInAction(() => {
            updateVariable(variableName, value);
          });
        }
      } catch (error) {
        console.error(`Error updating variable ${variableName}:`, error);
      }
    },
    []
  );

  const getVariableCallback = useCallback((variableName: string) => {
    return getVariableValue(variableName);
  }, []);

  // Hover system callbacks
  const setNodeHoverCallback = useCallback((nodeId: string, isHovered: boolean) => {
    runInAction(() => {
      computationStore.setNodeHover(nodeId, isHovered);
    });
  }, []);

  const getNodeHoverCallback = useCallback((nodeId: string) => {
    return computationStore.getNodeHover(nodeId);
  }, []);

  const setFormulaHoverCallback = useCallback((formulaId: string, isHovered: boolean) => {
    runInAction(() => {
      computationStore.setFormulaHover(formulaId, isHovered);
    });
  }, []);

  const getFormulaHoverCallback = useCallback((formulaId: string) => {
    return computationStore.getFormulaHover(formulaId);
  }, []);

  const onFormulaHoverChangeCallback = useCallback((callback: (formulaId: string, isHovered: boolean) => void) => {
    return computationStore.onFormulaHoverChange(callback);
  }, []);

  // Memoize custom config to prevent unnecessary re-renders
  const customConfig = useMemo(() => config.config, [config.config]);

  // Function to safely get all variables without causing loops
  const getAllVariablesSafe = useCallback(() => {
    const vars: Record<string, number> = {};
    computationStore.variables.forEach((variable, name) => {
      const value = variable.value;
      vars[name] = typeof value === "number" ? value : 0;
    });
    return vars;
  }, []);

  // Initial variable loading
  useEffect(() => {
    setVariables(getAllVariablesSafe());
  }, [getAllVariablesSafe]);

  // Set up variable change reaction only if needed
  useEffect(() => {
    if (!update.onVariableChange) return;

    const disposer = reaction(
      () => {
        // Create a stable hash of variable values
        const entries: string[] = [];
        computationStore.variables.forEach((variable, name) => {
          entries.push(`${name}:${variable.value}`);
        });
        return entries.sort().join("|");
      },
      () => {
        setVariables(getAllVariablesSafe());
      }
    );

    return () => disposer();
  }, [update.onVariableChange, getAllVariablesSafe]);

  // Render the component
  const renderContent = () => {
    if (!component) {
      return (
        <ErrorDisplay error="No component specified for custom visualization" />
      );
    }

    const ComponentClass = getRegistered(component);
    if (!ComponentClass) {
      return (
        <ErrorDisplay
          error={`Custom component "${component}" not found. Available: ${getAllRegistered().join(", ")}`}
        />
      );
    }

    try {
      // Create context with current variable values from state
      const context: IContext = {
        variables: variables, // Use the state variables with actual values
        updateVariable: updateVariableCallback,
        getVariable: getVariableCallback,
        // Bidirectional hover system
        setNodeHover: setNodeHoverCallback,
        getNodeHover: getNodeHoverCallback,
        setFormulaHover: setFormulaHoverCallback,
        getFormulaHover: getFormulaHoverCallback,
        onFormulaHoverChange: onFormulaHoverChangeCallback,
        // Custom config
        config: customConfig,
      };

      return <ComponentClass context={context} />;
    } catch (err) {
      return (
        <ErrorDisplay
          error={`Error rendering component: ${err instanceof Error ? err.message : String(err)}`}
        />
      );
    }
  };

  return (
    <div className="custom-visualization-container w-full h-full p-6 overflow-auto">
      <div className="flex items-center justify-center h-full">
        {renderContent()}
      </div>
    </div>
  );
};

export default Canvas;
