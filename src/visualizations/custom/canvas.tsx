import React, { useCallback, useEffect, useMemo, useState } from "react";

import { reaction, runInAction } from "mobx";

import { useStore } from "../../core/hooks";
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
  const context = useStore();
  const computationStore = context?.computationStore;
  const [variables, setVariables] = useState<Record<string, number>>({});
  const { component, update = {} } = config;

  // Create stable callback functions
  const updateVariableCallback = useCallback(
    (variableName: string, value: number) => {
      if (!computationStore) return;
      try {
        if (computationStore.variables.has(variableName)) {
          runInAction(() => {
            updateVariable(variableName, value, computationStore);
          });
        }
      } catch (error) {
        console.error(`Error updating variable ${variableName}:`, error);
      }
    },
    [computationStore]
  );

  const getVariableCallback = useCallback(
    (variableName: string) => {
      if (!computationStore) return 0;
      return getVariableValue(variableName, computationStore);
    },
    [computationStore]
  );

  // Hover system callbacks
  const setNodeHoverCallback = useCallback((nodeId: string, isHovered: boolean) => {
    if (!computationStore) return;
    runInAction(() => {
      computationStore.setNodeHover(nodeId, isHovered);
    });
  }, [computationStore]);

  const getNodeHoverCallback = useCallback((nodeId: string) => {
    if (!computationStore) return false;
    return computationStore.getNodeHover(nodeId);
  }, [computationStore]);

  const setFormulaHoverCallback = useCallback((formulaId: string, isHovered: boolean) => {
    if (!computationStore) return;
    runInAction(() => {
      computationStore.setFormulaHover(formulaId, isHovered);
    });
  }, [computationStore]);

  const getFormulaHoverCallback = useCallback((formulaId: string) => {
    if (!computationStore) return false;
    return computationStore.getFormulaHover(formulaId);
  }, [computationStore]);

  const onFormulaHoverChangeCallback = useCallback((callback: (formulaId: string, isHovered: boolean) => void) => {
    if (!computationStore) return () => {};
    return computationStore.onFormulaHoverChange(callback);
  }, [computationStore]);

  // Memoize custom config to prevent unnecessary re-renders
  const customConfig = useMemo(() => config.config, [config.config]);

  // Function to safely get all variables without causing loops
  const getAllVariablesSafe = useCallback(() => {
    if (!computationStore) return {};
    const vars: Record<string, number> = {};
    computationStore.variables.forEach((variable, name) => {
      const value = variable.value;
      vars[name] = typeof value === "number" ? value : 0;
    });
    return vars;
  }, [computationStore]);

  // Initial variable loading
  useEffect(() => {
    if (!computationStore) return;
    setVariables(getAllVariablesSafe());
  }, [getAllVariablesSafe, computationStore]);

  // Set up variable change reaction only if needed
  useEffect(() => {
    if (!computationStore || !update.onVariableChange) return;

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
  }, [computationStore, update.onVariableChange, getAllVariablesSafe]);

  // Guard: computationStore must be available
  if (!computationStore) {
    return <ErrorDisplay error="No computation store available" />;
  }

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
      const vizContext: IContext = {
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

      return <ComponentClass context={vizContext} />;
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
