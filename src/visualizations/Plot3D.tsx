import React, { useEffect, useRef, useState } from "react";

import { reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";

// Import Plotly as any to avoid type issues since @types/plotly.js-dist might not be available
import * as Plotly from "plotly.js-dist";

import { IPlot3D } from "../api";
import { computationStore } from "../api/computation";

interface Plot3DProps {
  config: IPlot3D;
}

interface DataPoint3D {
  x: number;
  y: number;
  z: number | null;
}

interface PlotMatrixData {
  xCoords: number[];
  yCoords: number[];
  zMatrix: (number | null)[][];
}

const Plot3D: React.FC<Plot3DProps> = observer(({ config }) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint3D[]>([]);
  const [currentPoint, setCurrentPoint] = useState<DataPoint3D | null>(null);
  // State for pre-built matrix data
  const [plotMatrixData, setPlotMatrixData] = useState<PlotMatrixData | null>(
    null
  );

  // Cache for local evaluation function to prevent regeneration
  const evalFunctionRef = useRef<
    ((variables: Record<string, number>) => Record<string, number>) | null
  >(null);
  const lastGeneratedCodeRef = useRef<string | null>(null);

  // Parse configuration options with defaults
  const {
    title = "",
    xAxis,
    yAxis,
    zAxis,
    width = 600,
    height = 600,
    plotType = "scatter",
  } = config;

  // Get min/max values or derive from range if not specified
  const xMin = xAxis.min ?? 0;
  const xMax = xAxis.max ?? 10;
  const yMin = yAxis.min ?? 0;
  const yMax = yAxis.max ?? 10;
  const zMin = zAxis.min ?? 0;
  const zMax = zAxis.max ?? 100;

  // FIXED: Increased sample density for smoother surfaces
  const SAMPLE_DENSITY = 2;
  const samples = Math.max(50, SAMPLE_DENSITY * 50);

  // Function to get variable value from computation store
  const getVariableValue = (variableName: string): number => {
    try {
      const varId = `var-${variableName}`;
      const variable = computationStore.variables.get(varId);
      return variable?.value ?? 0;
    } catch (error) {
      const varId = `var-${variableName}`;
      const variable = computationStore.variables.get(varId);
      return variable?.value ?? 0;
    }
  };

  // Function to get or create a cached evaluation function
  const getEvaluationFunction = ():
    | ((variables: Record<string, number>) => Record<string, number>)
    | null => {
    const debugState = computationStore.getDebugState();
    const currentCode = debugState.lastGeneratedCode;
    if (!currentCode) {
      console.warn("⚠️ No generated code available in computation store");
      return null;
    }

    // Check for cached function with code validation
    if (
      evalFunctionRef.current &&
      currentCode === lastGeneratedCodeRef.current
    ) {
      // Validate the cached function is still working
      try {
        // Test the function with a simple input
        const testResult = evalFunctionRef.current({ x: 0, y: 0, z: 0 });
        if (testResult && typeof testResult === "object") {
          console.log(
            "✅ Using SAFELY cached evaluation function from component ref"
          );
          return evalFunctionRef.current;
        } else {
          console.warn(
            "⚠️ Cached function returned invalid result, clearing cache"
          );
          evalFunctionRef.current = null;
          lastGeneratedCodeRef.current = null;
        }
      } catch (error) {
        console.warn(
          "⚠️ Cached function failed validation, clearing cache:",
          error
        );
        evalFunctionRef.current = null;
        lastGeneratedCodeRef.current = null;
      }
    }

    // Try to get existing function from store
    const hasFunction = debugState.hasFunction;
    if (hasFunction) {
      const storeFunction = (computationStore as any).evaluationFunction as (
        variables: Record<string, number>
      ) => Record<string, number>;
      if (storeFunction) {
        console.log(
          "✅ Using direct evaluation function from computation store"
        );
        evalFunctionRef.current = storeFunction;
        lastGeneratedCodeRef.current = currentCode;
        return storeFunction;
      }
    }

    // Create new evaluation function with enhanced error handling
    try {
      console.log("🔄 Creating LOCAL evaluation function from generated code");
      const newFunc = new Function(
        "variables",
        `"use strict";\n${currentCode}\nreturn evaluate(variables);`
      ) as (variables: Record<string, number>) => Record<string, number>;

      // Test the new function before caching
      try {
        const testResult = newFunc({ x: 0, y: 0, z: 0 });
        if (!testResult || typeof testResult !== "object") {
          console.error("❌ New evaluation function returned invalid result");
          return null;
        }
      } catch (testError) {
        console.error("❌ New evaluation function failed test:", testError);
        return null;
      }

      evalFunctionRef.current = newFunc;
      lastGeneratedCodeRef.current = currentCode;
      return newFunc;
    } catch (error) {
      console.error("❌ Error creating evaluation function:", error);
      return null;
    }
  };

  // FIXED: Function to calculate 3D data points with extended bounds for smooth edges
  const calculateDataPoints = () => {
    console.log("📈 Recalculating 3D data points");
    try {
      const localEvalFunction = getEvaluationFunction();
      if (!localEvalFunction) {
        console.warn(
          "⚠️ No evaluation function available - cannot generate 3D plot"
        );
        // Clear any existing data to prevent stale rendering
        setDataPoints([]);
        setCurrentPoint(null);
        setPlotMatrixData(null);
        return;
      }

      console.log("✅ Using cached evaluation function for 3D plot generation");

      // Take snapshot of all current variable values with validation
      const variablesMap: Record<string, number> = {};
      for (const [id, variable] of computationStore.variables.entries()) {
        if (
          variable &&
          typeof variable.value === "number" &&
          isFinite(variable.value)
        ) {
          const symbol = variable.symbol;
          variablesMap[symbol] = variable.value;
        }
      }

      // Validate we have the required variables
      if (variablesMap[xAxis.variable] === undefined) {
        variablesMap[xAxis.variable] = 0;
      }
      if (variablesMap[yAxis.variable] === undefined) {
        variablesMap[yAxis.variable] = 0;
      }

      const points: DataPoint3D[] = [];

      // Generate 3D data points
      if (plotType === "surface" || plotType === "mesh") {
        // FIXED: Build matrix with extended bounds for smooth edge clipping
        // STRATEGY: Calculate slightly beyond visual bounds, let Plotly clip naturally
        // - Eliminates zigzag by avoiding abrupt null transitions
        // - No artificial plateaus - just natural surface extension
        // - Visual bounds handled by Plotly's scene.zaxis.range
        const xStep = (xMax - xMin) / samples;
        const yStep = (yMax - yMin) / samples;

        // Extend calculation bounds slightly beyond visual bounds
        const zRange = zMax - zMin;
        const extendedZMin = zMin - zRange * 0.05; // 5% extension
        const extendedZMax = zMax + zRange * 0.05;

        // Pre-build the coordinate arrays to avoid floating-point errors
        const xCoords = Array.from(
          { length: samples + 1 },
          (_, i) => Math.round((xMin + i * xStep) * 1000) / 1000
        );
        const yCoords = Array.from(
          { length: samples + 1 },
          (_, i) => Math.round((yMin + i * yStep) * 1000) / 1000
        );

        // Build the z-matrix with extended bounds
        const zMatrix: (number | null)[][] = [];

        // Generate points row by row (y-direction first for proper matrix structure)
        for (let i = 0; i <= samples; i++) {
          const row: (number | null)[] = [];
          const y = yCoords[i];

          for (let j = 0; j <= samples; j++) {
            const x = xCoords[j];

            const calculationVars = { ...variablesMap };
            calculationVars[xAxis.variable] = x;
            calculationVars[yAxis.variable] = y;

            try {
              const result = localEvalFunction(calculationVars);
              const z = result[zAxis.variable];

              // FIXED: Enhanced validation to prevent WebGL crashes
              if (typeof z === "number" && !isNaN(z) && isFinite(z)) {
                // Accept values within extended bounds
                if (z >= extendedZMin && z <= extendedZMax) {
                  row.push(z); // Keep actual value - let Plotly clip at visual bounds
                  points.push({ x, y, z });
                } else {
                  // Far outside even extended bounds - use null
                  row.push(null);
                  points.push({ x, y, z: null });
                }
              } else {
                // Invalid calculation result (NaN, undefined, Infinity)
                row.push(null);
                points.push({ x, y, z: null });
              }
            } catch (error) {
              console.warn(
                `⚠️ Error calculating 3D point at (${x}, ${y}):`,
                error
              );
              // Add null point to maintain grid structure
              row.push(null);
              points.push({ x, y, z: null });
            }
          }
          zMatrix.push(row);
        }

        // Store the matrix and coordinates for later use
        setPlotMatrixData({
          xCoords,
          yCoords,
          zMatrix,
        });
      } else {
        // For line/scatter plots, generate points along a path
        const xStep = (xMax - xMin) / samples;
        for (let i = 0; i <= samples; i++) {
          const x = xMin + i * xStep;
          // For this example, we'll vary y as well, but this can be customized
          const y = yMin + ((yMax - yMin) * i) / samples;
          const calculationVars = { ...variablesMap };
          calculationVars[xAxis.variable] = x;
          calculationVars[yAxis.variable] = y;
          try {
            const result = localEvalFunction(calculationVars);
            const z = result[zAxis.variable];
            if (
              typeof z === "number" &&
              !isNaN(z) &&
              x >= xMin &&
              x <= xMax &&
              y >= yMin &&
              y <= yMax &&
              z >= zMin &&
              z <= zMax
            ) {
              points.push({ x, y, z });
            }
          } catch (error) {
            console.warn(
              `⚠️ Error calculating 3D point at (${x}, ${y}):`,
              error
            );
          }
        }
        // Clear matrix data for non-surface plots
        setPlotMatrixData(null);
      }

      // Get current point for highlighting
      const currentX = getVariableValue(xAxis.variable);
      const currentY = getVariableValue(yAxis.variable);
      const currentZ = getVariableValue(zAxis.variable);
      console.log(
        `🎯 Current 3D point: (${currentX.toFixed(2)}, ${currentY.toFixed(2)}, ${currentZ.toFixed(2)})`
      );
      console.log(`📊 Generated ${points.length} 3D data points`);
      setCurrentPoint({ x: currentX, y: currentY, z: currentZ });
      setDataPoints(points);
    } catch (error) {
      console.error("❌ Error calculating 3D plot data points:", error);
    }
  };

  // Monitor config changes and recalculate
  useEffect(() => {
    console.log("📊 3D Plot configuration changed:", {
      title,
      xAxis: { variable: xAxis.variable, min: xMin, max: xMax },
      yAxis: { variable: yAxis.variable, min: yMin, max: yMax },
      zAxis: { variable: zAxis.variable, min: zMin, max: zMax },
      plotType,
      dimensions: { width, height },
    });

    // Clear state immediately to prevent stale data rendering
    setDataPoints([]);
    setCurrentPoint(null);
    setPlotMatrixData(null);

    // Clear cached evaluation function to force recreation
    evalFunctionRef.current = null;
    lastGeneratedCodeRef.current = null;

    // Schedule recalculation with delay to ensure clean state transition
    const timeoutId = setTimeout(() => {
      console.log("⏱️ Recalculating 3D data points after configuration change");
      try {
        calculateDataPoints();
      } catch (error) {
        console.error(
          "❌ Error during configuration change recalculation:",
          error
        );
      }
    }, 100); // Increased delay for more stable transitions

    // Cleanup timeout on unmount or config change
    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    config.type,
    config.title,
    config.xAxis?.variable,
    config.xAxis?.label,
    config.xAxis?.min,
    config.xAxis?.max,
    config.yAxis?.variable,
    config.yAxis?.label,
    config.yAxis?.min,
    config.yAxis?.max,
    config.zAxis?.variable,
    config.zAxis?.label,
    config.zAxis?.min,
    config.zAxis?.max,
    config.width,
    config.height,
    config.plotType,
  ]);

  // Set up reaction to recalculate when variables change
  useEffect(() => {
    console.log("🔄 Setting up reaction for 3D plot updates");
    const disposer = reaction(
      () => {
        // Enhanced safety checks for transition states
        try {
          const relevantVariables = new Set([
            `var-${xAxis.variable}`,
            `var-${yAxis.variable}`,
            `var-${zAxis.variable}`,
          ]);
          const trackedValues: { [key: string]: number } = {};

          // Safe iteration over variables with validation
          Array.from(computationStore.variables.entries())
            .filter(([id]) => relevantVariables.has(id))
            .forEach(([id, v]) => {
              if (v && typeof v.value === "number" && isFinite(v.value)) {
                trackedValues[id] = v.value;
              }
            });

          return {
            xAxisValue: getVariableValue(xAxis.variable),
            yAxisValue: getVariableValue(yAxis.variable),
            zAxisValue: getVariableValue(zAxis.variable),
            functionHash: computationStore.lastGeneratedCode
              ? computationStore.lastGeneratedCode.substring(0, 20)
              : "none",
            // Add a transition marker to detect rapid changes
            timestamp: Date.now(),
          };
        } catch (error) {
          console.warn(
            "⚠️ Error in reaction tracker, using fallback state:",
            error
          );
          return {
            xAxisValue: 0,
            yAxisValue: 0,
            zAxisValue: 0,
            functionHash: "error",
            timestamp: Date.now(),
          };
        }
      },
      (newValues, oldValues) => {
        try {
          // Debounce rapid changes during transitions
          if (oldValues && newValues.timestamp - oldValues.timestamp < 50) {
            console.log("🔄 Debouncing rapid 3D variable changes");
            return;
          }

          console.log("🔄 3D Variable values changed - recalculating plot");
          calculateDataPoints();
        } catch (error) {
          console.error("❌ Error in 3D plot reaction:", error);
        }
      },
      {
        fireImmediately: true,
        equals: (prev, next) => {
          try {
            return (
              prev.xAxisValue === next.xAxisValue &&
              prev.yAxisValue === next.yAxisValue &&
              prev.zAxisValue === next.zAxisValue &&
              prev.functionHash === next.functionHash
            );
          } catch (error) {
            console.warn("⚠️ Error in reaction equality check:", error);
            return false; // Force update on error
          }
        },
      }
    );
    return () => {
      console.log("🧹 Cleaning up 3D plot reaction");
      disposer();
    };
  }, []);

  // FIXED: Updated plotting effect with proper matrix usage and smooth clipping
  useEffect(() => {
    if (!plotRef.current || dataPoints.length === 0) return;

    let plotData: Record<string, unknown>[] = [];

    if (plotType === "surface") {
      // FIXED: Use pre-built matrix instead of reconstructing
      if (plotMatrixData) {
        const { xCoords, yCoords, zMatrix } = plotMatrixData;

        // FIXED: Validate matrix data before passing to Plotly to prevent WebGL crashes
        const isValidMatrix = zMatrix.every((row) =>
          row.every(
            (value) =>
              value === null || (typeof value === "number" && isFinite(value))
          )
        );

        if (!isValidMatrix) {
          console.warn(
            "⚠️ Invalid matrix data detected, skipping surface plot"
          );
          return;
        }

        // Check if we have any valid data points
        const hasValidData = zMatrix.some((row) =>
          row.some(
            (value) =>
              value !== null && typeof value === "number" && isFinite(value)
          )
        );

        if (!hasValidData) {
          console.warn(
            "⚠️ No valid data points in matrix, skipping surface plot"
          );
          return;
        }

        plotData = [
          {
            type: "surface",
            x: xCoords,
            y: yCoords,
            z: zMatrix,
            colorscale: "Viridis",
            showscale: true,
            opacity: 0.8,
            connectgaps: false,
            // FIXED: Let Plotly handle color/z range clipping naturally
            cmin: zMin, // Visual color range (not calculation range)
            cmax: zMax,
            cauto: false,
            surfacecolor: zMatrix,
            hidesurface: false,
            // Disable contours for cleaner surface
            contours: {
              x: { show: false },
              y: { show: false },
              z: { show: false },
            },
          },
        ];
      } else {
        // Fallback to empty plot if matrix data isn't ready
        console.warn("⚠️ Matrix data not available for surface plot");
        return;
      }
    } else if (plotType === "line") {
      // Filter out null values for line plots
      const validPoints = dataPoints.filter((p) => p.z !== null);
      plotData = [
        {
          type: "scatter3d",
          mode: "lines",
          x: validPoints.map((p) => p.x),
          y: validPoints.map((p) => p.y),
          z: validPoints.map((p) => p.z),
          line: {
            width: 6,
            color: validPoints.map((p) => p.z),
            colorscale: "Viridis",
          },
        },
      ];
    } else if (plotType === "mesh") {
      // Filter out null values for mesh plots
      const validPoints = dataPoints.filter((p) => p.z !== null);
      plotData = [
        {
          type: "mesh3d",
          x: validPoints.map((p) => p.x),
          y: validPoints.map((p) => p.y),
          z: validPoints.map((p) => p.z),
          opacity: 0.7,
          color: "cyan",
        },
      ];
    } else {
      // Default to scatter plot - filter out null values
      const validPoints = dataPoints.filter((p) => p.z !== null);
      plotData = [
        {
          type: "scatter3d",
          mode: "markers",
          x: validPoints.map((p) => p.x),
          y: validPoints.map((p) => p.y),
          z: validPoints.map((p) => p.z),
          marker: {
            size: 4,
            color: validPoints.map((p) => p.z),
            colorscale: "Viridis",
            showscale: true,
          },
        },
      ];
    }

    // Add current point highlight if it exists
    if (
      currentPoint &&
      currentPoint.z !== null &&
      currentPoint.x >= xMin &&
      currentPoint.x <= xMax &&
      currentPoint.y >= yMin &&
      currentPoint.y <= yMax &&
      currentPoint.z >= zMin &&
      currentPoint.z <= zMax
    ) {
      plotData.push({
        type: "scatter3d",
        mode: "markers",
        x: [currentPoint.x],
        y: [currentPoint.y],
        z: [currentPoint.z],
        marker: {
          size: 10,
          color: "red",
        },
        name: "Current Point",
        showlegend: false,
      });
    }

    // Layout configuration - ensure boundaries match extended calculation bounds
    const layout = {
      title: title || "3D Visualization",
      scene: {
        xaxis: {
          title: {
            text: xAxis.label || xAxis.variable,
          },
          range: [xMin, xMax],
          autorange: false, // Enforce exact boundaries
        },
        yaxis: {
          title: {
            text: yAxis.label || yAxis.variable,
          },
          range: [yMin, yMax],
          autorange: false, // Enforce exact boundaries
        },
        zaxis: {
          title: {
            text: zAxis.label || zAxis.variable,
          },
          range: [zMin, zMax], // Visual range - clipping happens here
          autorange: false, // Enforce exact boundaries
        },
        aspectratio: {
          x: 1,
          y: 1,
          z: 1,
        },
        aspectmode: "manual",
      },
      width: typeof width === "number" ? width : parseInt(width as string, 10),
      height:
        typeof height === "number" ? height : parseInt(height as string, 10),
      margin: { l: 0, r: 0, b: 0, t: 40 },
    };

    // Configuration for Plotly
    const plotlyConfig = {
      displayModeBar: true,
      modeBarButtonsToRemove: ["pan2d", "lasso2d"],
      displaylogo: false,
      responsive: true,
    };

    // Create or update the plot
    (Plotly as any)
      .newPlot(plotRef.current, plotData, layout, plotlyConfig)
      .then(() => {
        console.log("✅ 3D Plot rendered successfully");
        // Add click handler for interactivity
        if (plotRef.current) {
          (plotRef.current as any).on("plotly_click", (data: any) => {
            if (data.points && data.points.length > 0) {
              const point = data.points[0];
              const clickedX = point.x;
              const clickedY = point.y;
              console.log(
                `📊 User clicked on 3D graph at (${clickedX}, ${clickedY})`
              );
              try {
                // Use proper MobX action to prevent strict mode violations
                runInAction(() => {
                  const xVarId = `var-${xAxis.variable}`;
                  const yVarId = `var-${yAxis.variable}`;

                  // Validate variables exist before setting
                  if (computationStore.variables.has(xVarId)) {
                    computationStore.setValue(xVarId, clickedX);
                  }
                  if (computationStore.variables.has(yVarId)) {
                    computationStore.setValue(yVarId, clickedY);
                  }
                });
              } catch (error: any) {
                console.error(
                  "Error updating variables through 3D plot click:",
                  error
                );
              }
            }
          });
        }
      })
      .catch((error: any) => {
        console.error("❌ Error rendering 3D plot:", error);
      });
  }, [
    dataPoints,
    plotMatrixData, // Added dependency for matrix data
    currentPoint,
    width,
    height,
    xMin,
    xMax,
    yMin,
    yMax,
    zMin,
    zMax,
    xAxis,
    yAxis,
    zAxis,
    title,
    plotType,
  ]);

  return (
    <div className="formulize-plot3d" style={{ position: "relative" }}>
      <div
        ref={plotRef}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
        }}
      />
    </div>
  );
});

export default Plot3D;
