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

import { IPlot3D } from "../../api";
import { computationStore } from "../../api/computation";
import {
  computeSurfaceIntersection,
  solveSingularFormula,
} from "../../api/computation-engines/singular-formula-solver";
import { IPoint3D, ISurface } from "../../types/plot3d";
import { getFormulaByName } from "../../util/formula-by-name";
import { getDefaultColorScale, resolveLineColor } from "./color";
import { getSurfaces } from "./surfaces";

interface Plot3DProps {
  config: IPlot3D;
}

interface LineData {
  name: string;
  points: IPoint3D[];
  color: string;
  width: number;
  showInLegend: boolean;
}

const Plot3D: React.FC<Plot3DProps> = observer(({ config }) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [currentPoint, setCurrentPoint] = useState<IPoint3D | null>(null);
  const [surfacesData, setSurfacesData] = useState<ISurface[]>([]);
  const [linesData, setLinesData] = useState<LineData[]>([]);
  const [isPlotInitialized, setIsPlotInitialized] = useState(false);

  // Parse configuration options with defaults
  const {
    title = "",
    xVar,
    xRange = [0, 10],
    yVar,
    yRange = [0, 10],
    zVar,
    zRange = [0, 100],
    width = 600,
    height = 600,
    plotType = "surface",
    showCurrentPointInLegend = false,
    surfaces = null,
    lines = null,
  } = config;

  // Get min/max values from ranges
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const [zMin, zMax] = zRange;

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

  // Helper function to get variable label from computation store
  const getVariableLabel = useCallback((variableName: string): string => {
    const varId = `var-${variableName}`;
    const variable = computationStore.variables.get(varId);
    return variable?.label || variableName; // Fallback to variable name if no label
  }, []);

  // Main calculation function for all surfaces
  const calculateSurfacesDataWrapper = useCallback(() => {
    const params = {
      xAxis: xVar,
      yAxis: yVar,
      zAxis: zVar,
      xMin,
      xMax,
      yMin,
      yMax,
      zMin,
      zMax,
      samples,
      getFormulaByName,
      getDefaultColorScale,
    };

    return getSurfaces(surfaces, params);
  }, [
    surfaces,
    xVar,
    yVar,
    zVar,
    xMin,
    xMax,
    yMin,
    yMax,
    zMin,
    zMax,
    samples,
    getFormulaByName,
    getDefaultColorScale,
  ]);

  // Calculate line data for a specific line configuration
  const calculateLineData = useCallback(
    (lineConfig: any, index: number): LineData | null => {
      const {
        name,
        surfaceIntersection,
        xFormula,
        yFormula,
        zFormula,
        parameterVariable = "t",
        parameterMin = xMin,
        parameterMax = xMax,
        color = "red",
        width = 6,
        showInLegend = true,
      } = lineConfig;

      const points: IPoint3D[] = [];
      const lineResolution = 100; // Higher resolution for smooth lines
      const paramStep = (parameterMax - parameterMin) / lineResolution;

      // Get current variable values as base context
      const baseVariables = Object.fromEntries(
        Array.from(computationStore.variables.entries()).map(([, v]) => [
          v.symbol,
          v.value,
        ])
      );

      // Check if this is an automatic surface intersection
      if (surfaceIntersection) {
        const { surface1, surface2 } = surfaceIntersection;

        // Get the formula expressions for both surfaces
        const surface1Formula = getFormulaByName(surface1);
        const surface2Formula = getFormulaByName(surface2);

        if (!surface1Formula || !surface2Formula) {
          console.warn(
            `Cannot find formulas for intersection: ${surface1}, ${surface2}`
          );
          return null;
        }

        for (let i = 0; i <= lineResolution; i++) {
          const paramValue = parameterMin + i * paramStep;

          // Compute intersection point at this parameter value
          const intersectionPoint = computeSurfaceIntersection(
            surface1Formula,
            surface2Formula,
            baseVariables,
            xVar,
            yVar,
            zVar,
            paramValue
          );

          if (intersectionPoint) {
            points.push({
              x: Number(intersectionPoint.x.toFixed(8)),
              y: Number(intersectionPoint.y.toFixed(8)),
              z: Number(intersectionPoint.z.toFixed(8)),
            });
          }
        }
      } else {
        // Original manual formula approach
        for (let i = 0; i <= lineResolution; i++) {
          const paramValue = parameterMin + i * paramStep;

          try {
            // Create variable context for this parameter value
            const variablesMap = { ...baseVariables };
            variablesMap[parameterVariable] = paramValue;

            let x: number | null = null;
            let y: number | null = null;
            let z: number | null = null;

            // Calculate x coordinate
            if (xFormula) {
              const xExpression = getFormulaByName(xFormula);
              if (xExpression) {
                x = solveSingularFormula(xExpression, variablesMap, xVar);
              }
            } else {
              x = paramValue; // Default to parameter value
            }

            // Calculate y coordinate
            if (yFormula) {
              const yExpression = getFormulaByName(yFormula);
              if (yExpression) {
                y = solveSingularFormula(yExpression, variablesMap, yVar);
              }
            } else {
              y = paramValue; // Default to parameter value
            }

            // Calculate z coordinate
            if (zFormula) {
              const zExpression = getFormulaByName(zFormula);
              if (zExpression) {
                z = solveSingularFormula(zExpression, variablesMap, zVar);
              }
            } else {
              z = paramValue; // Default to parameter value
            }

            // Add point if all coordinates are valid
            if (
              x !== null &&
              y !== null &&
              z !== null &&
              isFinite(x) &&
              isFinite(y) &&
              isFinite(z)
            ) {
              points.push({
                x: Number(x.toFixed(8)),
                y: Number(y.toFixed(8)),
                z: Number(z.toFixed(8)),
              });
            }
          } catch (error) {
            console.debug(
              `Error calculating line point at ${parameterVariable}=${paramValue}:`,
              error
            );
          }
        }
      }

      if (points.length === 0) {
        console.warn(`No valid points calculated for line: ${name}`);
        return null;
      }

      return {
        name,
        points,
        color: resolveLineColor(color),
        width,
        showInLegend,
      };
    },
    [getFormulaByName, xMin, xMax, xVar, yVar, zVar]
  );

  // Main calculation function for all lines
  const calculateLinesData = useCallback(() => {
    const linesToProcess = lines;
    if (!linesToProcess || linesToProcess.length === 0) {
      console.warn("No lines configuration provided");
      return [];
    }

    const results: LineData[] = [];

    linesToProcess.forEach((lineConfig, index) => {
      const lineData = calculateLineData(lineConfig, index);
      if (lineData) {
        results.push(lineData);
      } else {
        console.warn(`Failed to calculate line: ${lineConfig.name}`);
      }
    });
    return results;
  }, [lines, calculateLineData]);

  // Direct calculation function without debouncing
  const calculateDataPoints = useCallback(() => {
    try {
      const surfacesResult = calculateSurfacesDataWrapper();
      const linesResult = calculateLinesData();
      setSurfacesData(surfacesResult);
      setLinesData(linesResult);

      // Update current point
      const currentX = getVariableValue(xVar);
      const currentY = getVariableValue(yVar);
      const currentZ = getVariableValue(zVar);
      setCurrentPoint({ x: currentX, y: currentY, z: currentZ });
    } catch (error) {
      console.error("Error calculating 3D plot data:", error);
      setSurfacesData([]);
      setLinesData([]);
      setCurrentPoint(null);
    }
  }, [
    calculateSurfacesDataWrapper,
    calculateLinesData,
    xVar,
    yVar,
    zVar,
    getVariableValue,
  ]);

  useEffect(() => {
    setSurfacesData([]);
    setLinesData([]);
    setCurrentPoint(null);
    calculateDataPoints();
  }, [calculateDataPoints]);

  // Optimized MobX reaction without debouncing
  useEffect(() => {
    const disposer = reaction(
      () => {
        const xValue = getVariableValue(xVar);
        const yValue = getVariableValue(yVar);
        const zValue = getVariableValue(zVar);

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
  }, [xVar, yVar, zVar, getVariableValue, calculateDataPoints]);

  // Optimized plotting effect
  useEffect(() => {
    if (
      !plotRef.current ||
      (surfacesData.length === 0 && linesData.length === 0)
    )
      return;

    const plotData: Record<string, unknown>[] = [];
    let hasColorbar = false; // Track if any surface shows a colorbar

    // First pass: count how many surfaces want colorbars and assign positions
    const colorbarSurfaces: number[] = [];
    surfacesData.forEach((surfaceData, index) => {
      if (surfaceData.showColorbar === true && surfaceData.matrixData) {
        colorbarSurfaces.push(index);
        hasColorbar = true;
      }
    });

    surfacesData.forEach((surfaceData, index) => {
      if (!surfaceData.matrixData) return;
      const { xCoords, yCoords, zCoords } = surfaceData.matrixData;
      const hasValidData = zCoords.some((row: (number | null)[]) =>
        row.some(
          (value: number | null) => value !== null && typeof value === "number"
        )
      );
      if (!hasValidData) {
        console.warn(`No valid data for surface: ${surfaceData.formulaName}`);
        return;
      }

      // Determine if this specific surface should show a colorbar and its position
      const colorbarIndex = colorbarSurfaces.indexOf(index);
      const shouldShowColorbar = colorbarIndex >= 0;

      // Position colorbars side by side, starting from the right
      const colorbarX = shouldShowColorbar
        ? 1.02 + colorbarIndex * 0.08
        : undefined;

      // Create surface plot data based on plot type
      if (plotType === "surface") {
        plotData.push({
          type: "surface",
          x: xCoords,
          y: yCoords,
          z: zCoords,
          colorscale: surfaceData.color,
          showscale: shouldShowColorbar,
          opacity: surfaceData.opacity,
          connectgaps: false,
          name: surfaceData.formulaName,
          showlegend: surfaceData.showInLegend,
          contours: {
            x: { show: false },
            y: { show: false },
            z: { show: false },
          },
          hidesurface: false,
          colorbar: shouldShowColorbar
            ? {
                x: colorbarX, // Position colorbar with offset for multiple bars
                len: 0.8, // Make it shorter to leave room for legend
                thickness: 5,
                title: {
                  text: surfaceData.formulaName, // Use surface name as colorbar title
                  side: "right",
                },
              }
            : undefined,
        });
      } else if (plotType === "mesh") {
        const validPoints =
          surfaceData.points?.filter((p: IPoint3D) => p.z !== null) || [];
        if (validPoints.length > 0) {
          plotData.push({
            type: "mesh3d",
            x: validPoints.map((p: IPoint3D) => p.x),
            y: validPoints.map((p: IPoint3D) => p.y),
            z: validPoints.map((p: IPoint3D) => p.z),
            opacity: surfaceData.opacity,
            colorscale: surfaceData.color,
            intensity: validPoints.map((p: IPoint3D) => p.z),
            name: surfaceData.formulaName,
            showlegend: surfaceData.showInLegend,
            showscale: shouldShowColorbar,
            colorbar: shouldShowColorbar
              ? {
                  x: colorbarX,
                  len: 0.8,
                  thickness: 5,
                  title: {
                    text: surfaceData.formulaName,
                    side: "right",
                  },
                }
              : undefined,
          });
        }
      } else {
        // Scatter plot fallback
        const validPoints =
          surfaceData.points?.filter((p: IPoint3D) => p.z !== null) || [];
        if (validPoints.length > 0) {
          plotData.push({
            type: "scatter3d",
            mode: "markers",
            x: validPoints.map((p: IPoint3D) => p.x),
            y: validPoints.map((p: IPoint3D) => p.y),
            z: validPoints.map((p: IPoint3D) => p.z),
            marker: {
              size: 3,
              color: validPoints.map((p: IPoint3D) => p.z),
              colorscale: surfaceData.color,
              showscale: shouldShowColorbar,
              colorbar: shouldShowColorbar
                ? {
                    x: colorbarX,
                    len: 0.8,
                    thickness: 5,
                    title: {
                      text: surfaceData.formulaName,
                      side: "right",
                    },
                  }
                : undefined,
            },
            name: surfaceData.formulaName,
            showlegend: surfaceData.showInLegend,
          });
        }
      }
    });

    // Process each line
    linesData.forEach((lineData) => {
      const validPoints = lineData.points.filter((p) => p.z !== null);
      if (validPoints.length > 0) {
        plotData.push({
          type: "scatter3d",
          mode: "lines",
          x: validPoints.map((p) => p.x),
          y: validPoints.map((p) => p.y),
          z: validPoints.map((p) => p.z),
          line: {
            width: lineData.width,
            color: lineData.color,
          },
          name: lineData.name,
          showlegend: lineData.showInLegend,
        });
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
        name: `Current Point`,
        showlegend: showCurrentPointInLegend,
      });
    }

    // Layout configuration
    const layout = {
      title: title || "3D Visualization",
      uirevision: "persistent", // This key setting preserves user interactions like camera angle
      autosize: true, // Let Plotly automatically size to container
      scene: {
        xaxis: {
          title: {
            text: getVariableLabel(xVar),
          },
          range: [xMin, xMax],
          autorange: false,
        },
        yaxis: {
          title: {
            text: getVariableLabel(yVar),
          },
          range: [yMin, yMax],
          autorange: false,
        },
        zaxis: {
          title: {
            text: getVariableLabel(zVar),
          },
          range: [zMin, zMax],
          autorange: false,
        },
        aspectratio: { x: 1, y: 1, z: 1 },
        aspectmode: "manual",
      },
      margin: hasColorbar
        ? { l: 0, r: 0, b: 0, t: 0 }
        : { l: 0, r: 0, b: 0, t: 0 },
      legend: {
        x: 0,
        y: 1,
        xanchor: "left",
        yanchor: "top",
        bgcolor: "rgba(255, 255, 255, 0.8)",
        bordercolor: "rgba(0, 0, 0, 0.05)",
        borderwidth: 1,
        font: {
          size: 11,
        },
        itemsizing: "constant",
        traceorder: "normal",
      },
      modebar: {
        orientation: "v",
        bgcolor: "rgba(255, 255, 255, 0.8)",
        color: "rgba(0, 0, 0, 0.7)",
        activecolor: "rgba(0, 0, 0, 0.9)",
      },
    };

    // Plotly configuration
    const plotlyConfig = {
      displayModeBar: true,
      displaylogo: false,
      responsive: true, // This is the key for proper container sizing
      modeBarButtonsToRemove: [], // Keep all buttons but position them properly
    };

    // Use newPlot for initial creation, react for updates to preserve user interactions
    const plotMethod = isPlotInitialized
      ? (Plotly as any).react
      : (Plotly as any).newPlot;

    plotMethod(plotRef.current, plotData, layout, plotlyConfig)
      .then(() => {
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
                  const xVarId = `var-${xVar}`;
                  const yVarId = `var-${yVar}`;

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
    linesData,
    currentPoint,
    plotType,
    title,
    isPlotInitialized,
    showCurrentPointInLegend,
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
    <div
      ref={plotRef}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
});

export default Plot3D;
