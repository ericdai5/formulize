import React, { useEffect, useRef, useState } from "react";

import { reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";

// Import Plotly as any to avoid type issues since @types/plotly.js-dist might not be available
import * as Plotly from "plotly.js-dist";

import { IPlot3D } from "../api";
import { computationStore } from "../computation";

interface Plot3DProps {
  config: IPlot3D;
}

interface DataPoint3D {
  x: number;
  y: number;
  z: number;
}

const Plot3D: React.FC<Plot3DProps> = observer(({ config }) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint3D[]>([]);
  const [currentPoint, setCurrentPoint] = useState<DataPoint3D | null>(null);

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
    width = 800,
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

  // Calculate appropriate number of samples for 3D plotting
  const SAMPLE_DENSITY = 2; // Lower density for 3D to maintain performance
  const samples = Math.max(25, SAMPLE_DENSITY * 20); // Minimum 25 samples for 3D

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

    // Check for cached function
    if (
      evalFunctionRef.current &&
      currentCode === lastGeneratedCodeRef.current
    ) {
      console.log(
        "✅ Using SAFELY cached evaluation function from component ref"
      );
      return evalFunctionRef.current;
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

    // Create new evaluation function
    try {
      console.log("🔄 Creating LOCAL evaluation function from generated code");
      const newFunc = new Function(
        "variables",
        `"use strict";\n${currentCode}\nreturn evaluate(variables);`
      ) as (variables: Record<string, number>) => Record<string, number>;

      evalFunctionRef.current = newFunc;
      lastGeneratedCodeRef.current = currentCode;
      return newFunc;
    } catch (error) {
      console.error("❌ Error creating evaluation function:", error);
      return null;
    }
  };

  // Function to calculate 3D data points
  const calculateDataPoints = () => {
    console.log("📈 Recalculating 3D data points");

    try {
      const localEvalFunction = getEvaluationFunction();

      if (!localEvalFunction) {
        console.warn(
          "⚠️ No evaluation function available - cannot generate 3D plot"
        );
        return;
      }

      console.log("✅ Using cached evaluation function for 3D plot generation");

      // Take snapshot of all current variable values
      const variablesMap: Record<string, number> = {};
      for (const [id, variable] of computationStore.variables.entries()) {
        const symbol = variable.symbol;
        variablesMap[symbol] = variable.value;
      }

      const points: DataPoint3D[] = [];

      // Generate 3D data points
      if (plotType === "surface") {
        // For surface plots, generate a grid of points
        const xStep = (xMax - xMin) / samples;
        const yStep = (yMax - yMin) / samples;

        for (let i = 0; i <= samples; i++) {
          for (let j = 0; j <= samples; j++) {
            const x = xMin + i * xStep;
            const y = yMin + j * yStep;

            const calculationVars = { ...variablesMap };
            calculationVars[xAxis.variable] = x;
            calculationVars[yAxis.variable] = y;

            try {
              const result = localEvalFunction(calculationVars);
              let z = result[zAxis.variable];

              // Fallback to formula-defined variable if needed
              if (z === undefined) {
                const formula = computationStore.formula;
                const formulaMatch = formula.match(/^\s*([A-Za-z])\s*=/);
                const formulaDepVar = formulaMatch ? formulaMatch[1] : null;

                if (formulaDepVar && result[formulaDepVar] !== undefined) {
                  z = result[formulaDepVar];
                }
              }

              if (
                typeof z === "number" &&
                !isNaN(z) &&
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
        }
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
            let z = result[zAxis.variable];

            if (z === undefined) {
              const formula = computationStore.formula;
              const formulaMatch = formula.match(/^\s*([A-Za-z])\s*=/);
              const formulaDepVar = formulaMatch ? formulaMatch[1] : null;

              if (formulaDepVar && result[formulaDepVar] !== undefined) {
                z = result[formulaDepVar];
              }
            }

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

    setDataPoints([]);
    setCurrentPoint(null);

    setTimeout(() => {
      console.log("⏱️ Recalculating 3D data points after configuration change");
      calculateDataPoints();
    }, 50);
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
        const relevantVariables = new Set([
          `var-${xAxis.variable}`,
          `var-${yAxis.variable}`,
          `var-${zAxis.variable}`,
        ]);

        const trackedValues: { [key: string]: number } = {};
        Array.from(computationStore.variables.entries())
          .filter(([id]) => relevantVariables.has(id))
          .forEach(([id, v]) => {
            trackedValues[id] = v.value;
          });

        return {
          xAxisValue: getVariableValue(xAxis.variable),
          yAxisValue: getVariableValue(yAxis.variable),
          zAxisValue: getVariableValue(zAxis.variable),
          functionHash: computationStore.lastGeneratedCode
            ? computationStore.lastGeneratedCode.substring(0, 20)
            : "none",
        };
      },
      (newValues, oldValues) => {
        console.log("🔄 3D Variable values changed - recalculating plot");
        calculateDataPoints();
      },
      {
        fireImmediately: true,
        equals: (prev, next) => {
          return (
            prev.xAxisValue === next.xAxisValue &&
            prev.yAxisValue === next.yAxisValue &&
            prev.zAxisValue === next.zAxisValue &&
            prev.functionHash === next.functionHash
          );
        },
      }
    );

    return () => {
      console.log("🧹 Cleaning up 3D plot reaction");
      disposer();
    };
  }, []);

  // Create and update Plotly chart when data changes
  useEffect(() => {
    if (!plotRef.current || dataPoints.length === 0) return;

    console.log("📊 Rendering 3D plot with Plotly.js");

    // Prepare data based on plot type
    let plotData: any[] = [];

    if (plotType === "surface") {
      // For surface plots, we need to organize data into a grid
      const uniqueX = [...new Set(dataPoints.map((p) => p.x))].sort(
        (a, b) => a - b
      );
      const uniqueY = [...new Set(dataPoints.map((p) => p.y))].sort(
        (a, b) => a - b
      );

      const zMatrix = uniqueY.map((y) =>
        uniqueX.map((x) => {
          const point = dataPoints.find(
            (p) => Math.abs(p.x - x) < 0.001 && Math.abs(p.y - y) < 0.001
          );
          return point ? point.z : null;
        })
      );

      plotData = [
        {
          type: "surface",
          x: uniqueX,
          y: uniqueY,
          z: zMatrix,
          colorscale: "Viridis",
          showscale: true,
        },
      ];
    } else if (plotType === "line") {
      plotData = [
        {
          type: "scatter3d",
          mode: "lines",
          x: dataPoints.map((p) => p.x),
          y: dataPoints.map((p) => p.y),
          z: dataPoints.map((p) => p.z),
          line: {
            width: 6,
            color: dataPoints.map((p) => p.z),
            colorscale: "Viridis",
          },
        },
      ];
    } else if (plotType === "mesh") {
      plotData = [
        {
          type: "mesh3d",
          x: dataPoints.map((p) => p.x),
          y: dataPoints.map((p) => p.y),
          z: dataPoints.map((p) => p.z),
          opacity: 0.7,
          color: "cyan",
        },
      ];
    } else {
      // Default to scatter plot
      plotData = [
        {
          type: "scatter3d",
          mode: "markers",
          x: dataPoints.map((p) => p.x),
          y: dataPoints.map((p) => p.y),
          z: dataPoints.map((p) => p.z),
          marker: {
            size: 4,
            color: dataPoints.map((p) => p.z),
            colorscale: "Viridis",
            showscale: true,
          },
        },
      ];
    }

    // Add current point highlight if it exists
    if (
      currentPoint &&
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

    // Layout configuration
    const layout = {
      title: title || "3D Visualization",
      scene: {
        xaxis: {
          title: xAxis.label || xAxis.variable,
          range: [xMin, xMax],
        },
        yaxis: {
          title: yAxis.label || yAxis.variable,
          range: [yMin, yMax],
        },
        zaxis: {
          title: zAxis.label || zAxis.variable,
          range: [zMin, zMax],
        },
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
                // Use basic setValue functionality that exists in the store
                runInAction(() => {
                  computationStore.setValue(`var-${xAxis.variable}`, clickedX);
                  computationStore.setValue(`var-${yAxis.variable}`, clickedY);
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
