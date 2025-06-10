import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";

// Import Plotly as any to avoid type issues since @types/plotly.js-dist might not be available
import * as Plotly from "plotly.js-dist";

import { IPlot3D } from "../api";
import { computationStore } from "../api/computation";
import { solveSingularFormula } from "../api/computation-engines/singular-formula-solver";

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

interface SurfaceData {
  name: string;
  matrixData: PlotMatrixData | null;
  points: DataPoint3D[];
  color: string;
  opacity: number;
  showInLegend: boolean;
}

const Plot3D: React.FC<Plot3DProps> = observer(({ config }) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [currentPoint, setCurrentPoint] = useState<DataPoint3D | null>(null);
  const [surfacesData, setSurfacesData] = useState<SurfaceData[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPlotInitialized, setIsPlotInitialized] = useState(false);

  // Parse configuration options with defaults
  const {
    title = "",
    xAxis,
    yAxis,
    zAxis,
    width = 600,
    height = 600,
    plotType = "surface",
    surfaces = null,
  } = config;

  // Get min/max values or derive from range if not specified
  const xMin = xAxis.min ?? 0;
  const xMax = xAxis.max ?? 10;
  const yMin = yAxis.min ?? 0;
  const yMax = yAxis.max ?? 10;
  const zMin = zAxis.min ?? 0;
  const zMax = zAxis.max ?? 100;

  // Optimized sample density for smooth surfaces, especially for parametric equations
  const samples = useMemo(() => {
    // For parametric surfaces, we need higher resolution to avoid interpolation artifacts
    // Especially important for linear relationships that should produce straight edges
    const baseResolution = 50; // Minimum for smooth surfaces
    const maxResolution = 100; // Cap for performance

    // Calculate optimal sampling based on domain size
    const xRange = Math.abs(xMax - xMin);
    const yRange = Math.abs(yMax - yMin);
    const avgRange = (xRange + yRange) / 2;

    // Use higher resolution for smaller domains to maintain quality
    const dynamicSamples = Math.ceil(baseResolution + (avgRange > 5 ? 20 : 30));

    return Math.min(maxResolution, Math.max(baseResolution, dynamicSamples));
  }, [xMax, xMin, yMax, yMin]);

  // Function to get variable value from computation store
  const getVariableValue = useCallback((variableName: string): number => {
    try {
      const varId = `var-${variableName}`;
      const variable = computationStore.variables.get(varId);
      return variable?.value ?? 0;
    } catch (error) {
      return 0;
    }
  }, []);

  // Function to get formula expression by name
  const getFormulaByName = useCallback((formulaName: string): string | null => {
    try {
      const currentConfig = (window as any).__lastFormulizeConfig;
      if (!currentConfig || !currentConfig.formulas) {
        return null;
      }

      const formula = currentConfig.formulas.find(
        (f: any) => f.name === formulaName
      );
      return formula?.expression || null;
    } catch (error) {
      console.error("Error getting formula by name:", error);
      return null;
    }
  }, []);

  // Helper function to solve equations using singular formula solver
  const solveForVariable = useCallback(
    (
      formulaExpression: string,
      variables: Record<string, number>,
      solveFor: string
    ): number | null => {
      try {
        // Use the singular formula solver
        const result = solveSingularFormula(
          formulaExpression,
          variables,
          solveFor
        );
        return result;
      } catch (error) {
        console.debug("Error solving for variable:", error);
        return null;
      }
    },
    []
  );

  // Calculate surface data for a specific formula
  const calculateSurfaceData = useCallback(
    (surfaceConfig: any, index: number): SurfaceData | null => {
      // Get the formula expression by name
      const formulaExpression = getFormulaByName(surfaceConfig.formulaName);
      if (!formulaExpression) {
        console.warn(`Formula not found: ${surfaceConfig.formulaName}`);
        return null;
      }

      console.log(
        `Calculating surface for formula: ${surfaceConfig.formulaName}`
      );
      console.log(`Formula expression: ${formulaExpression}`);

      const points: DataPoint3D[] = [];
      const xStep = (xMax - xMin) / samples;
      const yStep = (yMax - yMin) / samples;

      // Generate coordinates without excessive rounding to avoid aliasing
      // Use higher precision for parametric surfaces
      const xCoords = Array.from({ length: samples + 1 }, (_, i) =>
        Number((xMin + i * xStep).toFixed(6))
      );
      const yCoords = Array.from({ length: samples + 1 }, (_, i) =>
        Number((yMin + i * yStep).toFixed(6))
      );

      const zMatrix: (number | null)[][] = [];

      // Get current variable values as base context
      const baseVariables = Object.fromEntries(
        Array.from(computationStore.variables.entries()).map(([, v]) => [
          v.symbol,
          v.value,
        ])
      );

      for (let i = 0; i <= samples; i++) {
        const row: (number | null)[] = [];
        const y = yCoords[i];

        for (let j = 0; j <= samples; j++) {
          const x = xCoords[j];
          let z: number | null = null;

          try {
            // Create variable context for this point
            const variablesMap = { ...baseVariables };
            variablesMap[xAxis.variable] = x;
            variablesMap[yAxis.variable] = y;

            // Solve for the z variable using the singular formula solver
            z = solveForVariable(
              formulaExpression,
              variablesMap,
              zAxis.variable
            );

            // Enhanced validation - allow parametric surfaces to extend beyond display limits
            if (z !== null && isFinite(z)) {
              // Round to reasonable precision to avoid floating point artifacts
              const roundedZ = Number(z.toFixed(8));
              row.push(roundedZ);
              points.push({ x, y, z: roundedZ });
            } else {
              // Only set to null for actual calculation failures, not range limits
              row.push(null);
              points.push({ x, y, z: null });
            }
          } catch (error) {
            // Keep z as null for failed evaluations
            row.push(null);
            points.push({ x, y, z: null });
          }
        }
        zMatrix.push(row);
      }

      // Simplified matrix processing - skip expensive gap filling
      const filledMatrix = zMatrix;

      return {
        name: surfaceConfig.formulaName || `Surface ${index + 1}`,
        matrixData: { xCoords, yCoords, zMatrix: filledMatrix },
        points,
        color: surfaceConfig.color || getDefaultColorScale(index),
        opacity: surfaceConfig.opacity ?? 0.7,
        showInLegend: surfaceConfig.showInLegend !== false,
      };
    },
    [
      getFormulaByName,
      solveForVariable,
      xMax,
      xMin,
      yMax,
      yMin,
      samples,
      zMax,
      zMin,
      xAxis.variable,
      yAxis.variable,
      zAxis.variable,
    ]
  );

  // Helper function to get default color scales
  const getDefaultColorScale = useCallback((index: number): string => {
    const colorScales = ["Viridis", "Plasma", "Inferno", "Magma", "Cividis"];
    return colorScales[index % colorScales.length];
  }, []);

  // Main calculation function for all surfaces
  const calculateSurfacesData = useCallback(() => {
    const surfacesToProcess = surfaces;
    if (!surfacesToProcess || surfacesToProcess.length === 0) {
      console.log("No surfaces configuration provided, using default");
      return [];
    }

    console.log("Processing surfaces:", surfacesToProcess);

    const results: SurfaceData[] = [];

    surfacesToProcess.forEach((surfaceConfig, index) => {
      const surfaceData = calculateSurfaceData(surfaceConfig, index);
      if (surfaceData) {
        console.log(`Successfully calculated surface: ${surfaceData.name}`);
        results.push(surfaceData);
      } else {
        console.warn(
          `Failed to calculate surface: ${surfaceConfig.formulaName}`
        );
      }
    });

    console.log(`Total surfaces calculated: ${results.length}`);
    return results;
  }, [surfaces, calculateSurfaceData]);

  // Direct calculation function without debouncing
  const calculateDataPoints = useCallback(() => {
    if (isCalculating) return;

    setIsCalculating(true);
    try {
      const surfacesResult = calculateSurfacesData();
      setSurfacesData(surfacesResult);

      // Update current point
      const currentX = getVariableValue(xAxis.variable);
      const currentY = getVariableValue(yAxis.variable);
      const currentZ = getVariableValue(zAxis.variable);
      setCurrentPoint({ x: currentX, y: currentY, z: currentZ });
    } catch (error) {
      console.error("Error calculating 3D plot data:", error);
      setSurfacesData([]);
      setCurrentPoint(null);
    } finally {
      setIsCalculating(false);
    }
  }, [
    calculateSurfacesData,
    xAxis.variable,
    yAxis.variable,
    zAxis.variable,
    getVariableValue,
    isCalculating,
  ]);

  // Monitor config changes
  useEffect(() => {
    // Clear existing data immediately
    setSurfacesData([]);
    setCurrentPoint(null);

    // Schedule recalculation
    calculateDataPoints();
  }, [calculateDataPoints]);

  // Optimized MobX reaction without debouncing
  useEffect(() => {
    const disposer = reaction(
      () => {
        const xValue = getVariableValue(xAxis.variable);
        const yValue = getVariableValue(yAxis.variable);
        const zValue = getVariableValue(zAxis.variable);

        return { xValue, yValue, zValue };
      },
      (newValues, oldValues) => {
        if (
          oldValues &&
          Math.abs(newValues.xValue - oldValues.xValue) < 0.01 &&
          Math.abs(newValues.yValue - oldValues.yValue) < 0.01 &&
          Math.abs(newValues.zValue - oldValues.zValue) < 0.01
        ) {
          return;
        }

        calculateDataPoints();
      },
      {
        fireImmediately: false,
        equals: (prev, next) => {
          return (
            prev.xValue === next.xValue &&
            prev.yValue === next.yValue &&
            prev.zValue === next.zValue
          );
        },
      }
    );

    return disposer;
  }, [
    xAxis.variable,
    yAxis.variable,
    zAxis.variable,
    getVariableValue,
    calculateDataPoints,
  ]);

  // Optimized plotting effect
  useEffect(() => {
    if (!plotRef.current || surfacesData.length === 0) return;

    console.log(
      "Rendering plot with surfaces:",
      surfacesData.map((s) => s.name)
    );

    const plotData: Record<string, unknown>[] = [];

    // Process each surface
    surfacesData.forEach((surfaceData, index) => {
      if (!surfaceData.matrixData) return;

      const { xCoords, yCoords, zMatrix } = surfaceData.matrixData;

      // Validate that we have sufficient data
      const hasValidData = zMatrix.some((row) =>
        row.some((value) => value !== null && typeof value === "number")
      );

      if (!hasValidData) {
        console.warn(`No valid data for surface: ${surfaceData.name}`);
        return;
      }

      console.log(`Adding surface to plot: ${surfaceData.name}`);

      // Create surface plot data based on plot type
      if (plotType === "surface") {
        plotData.push({
          type: "surface",
          x: xCoords,
          y: yCoords,
          z: zMatrix,
          colorscale: surfaceData.color,
          showscale: index === 0,
          opacity: surfaceData.opacity,
          connectgaps: false,
          name: surfaceData.name,
          showlegend: surfaceData.showInLegend,
          contours: {
            x: { show: false },
            y: { show: false },
            z: { show: false },
          },
          hidesurface: false,
        });
      } else if (plotType === "mesh") {
        const validPoints = surfaceData.points.filter((p) => p.z !== null);
        if (validPoints.length > 0) {
          plotData.push({
            type: "mesh3d",
            x: validPoints.map((p) => p.x),
            y: validPoints.map((p) => p.y),
            z: validPoints.map((p) => p.z),
            opacity: surfaceData.opacity,
            colorscale: surfaceData.color,
            intensity: validPoints.map((p) => p.z),
            name: surfaceData.name,
            showlegend: surfaceData.showInLegend,
          });
        }
      } else {
        // Scatter plot fallback
        const validPoints = surfaceData.points.filter((p) => p.z !== null);
        if (validPoints.length > 0) {
          plotData.push({
            type: "scatter3d",
            mode: "markers",
            x: validPoints.map((p) => p.x),
            y: validPoints.map((p) => p.y),
            z: validPoints.map((p) => p.z),
            marker: {
              size: 3,
              color: validPoints.map((p) => p.z),
              colorscale: surfaceData.color,
              showscale: index === 0,
            },
            name: surfaceData.name,
            showlegend: surfaceData.showInLegend,
          });
        }
      }
    });

    // Add current point marker
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
          size: 8,
          color: "red",
          symbol: "diamond",
        },
        name: "Current Point",
        showlegend: false,
      });
    }

    // Layout configuration
    const layout = {
      title: title || "3D Visualization",
      uirevision: "persistent", // This key setting preserves user interactions like camera angle
      scene: {
        xaxis: {
          title: xAxis.label || xAxis.variable,
          range: [xMin, xMax],
          autorange: false,
        },
        yaxis: {
          title: yAxis.label || yAxis.variable,
          range: [yMin, yMax],
          autorange: false,
        },
        zaxis: {
          title: zAxis.label || zAxis.variable,
          range: [zMin, zMax],
          autorange: false,
        },
        aspectratio: { x: 1, y: 1, z: 1 },
        aspectmode: "manual",
      },
      width: typeof width === "number" ? width : parseInt(width as string, 10),
      height:
        typeof height === "number" ? height : parseInt(height as string, 10),
      margin: { l: 0, r: 0, b: 0, t: 40 },
    };

    // Plotly configuration
    const plotlyConfig = {
      displayModeBar: true,
      displaylogo: false,
      responsive: true,
    };

    // Use newPlot for initial creation, react for updates to preserve user interactions
    const plotMethod = isPlotInitialized
      ? (Plotly as any).react
      : (Plotly as any).newPlot;

    plotMethod(plotRef.current, plotData, layout, plotlyConfig)
      .then(() => {
        console.log("Plot rendered successfully");

        // Mark plot as initialized after first render
        if (!isPlotInitialized) {
          setIsPlotInitialized(true);
        }

        // Add event listener only once after successful render
        if (plotRef.current && !isPlotInitialized) {
          const handlePlotClick = (data: any) => {
            if (data.points && data.points.length > 0) {
              const point = data.points[0];
              try {
                runInAction(() => {
                  const xVarId = `var-${xAxis.variable}`;
                  const yVarId = `var-${yAxis.variable}`;

                  if (computationStore.variables.has(xVarId)) {
                    computationStore.setValue(xVarId, point.x);
                  }
                  if (computationStore.variables.has(yVarId)) {
                    computationStore.setValue(yVarId, point.y);
                  }
                });
              } catch (error) {
                console.error("Error updating variables:", error);
              }
            }
          };

          (plotRef.current as any).on("plotly_click", handlePlotClick);
        }
      })
      .catch((error: any) => {
        console.error("Error rendering 3D plot:", error);
      });
  }, [
    surfacesData,
    currentPoint,
    plotType,
    title,
    isPlotInitialized,
    // Removed many dependencies to reduce re-renders
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup Plotly instance and event listeners
      if (plotRef.current) {
        try {
          (Plotly as any).purge(plotRef.current);
        } catch (error) {
          console.debug("Error during Plotly cleanup:", error);
        }
      }
    };
  }, []);

  return (
    <div className="formulize-plot3d" style={{ position: "relative" }}>
      {isCalculating && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "5px 10px",
            borderRadius: "3px",
            fontSize: "12px",
            zIndex: 1000,
          }}
        >
          Calculating...
        </div>
      )}
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
