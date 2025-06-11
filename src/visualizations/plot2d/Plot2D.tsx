import React, { useEffect, useRef, useState } from "react";

import { reaction, runInAction } from "mobx";
import { observer } from "mobx-react-lite";

import * as d3 from "d3";

import { IPlot2D } from "../../api";
import { computationStore } from "../../api/computation";

interface Plot2DProps {
  config: IPlot2D;
}

interface DataPoint {
  x: number;
  y: number;
}

const Plot2D: React.FC<Plot2DProps> = observer(({ config }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [currentPoint, setCurrentPoint] = useState<DataPoint | null>(null);

  // Cache for local evaluation function to prevent regeneration
  const evalFunctionRef = useRef<
    ((variables: Record<string, number>) => Record<string, number>) | null
  >(null);
  const lastGeneratedCodeRef = useRef<string | null>(null);

  // Parse configuration options with defaults
  const {
    title = "",
    xVar,
    xRange = [0, 10],
    yVar,
    yRange = [0, 100],
    width = 600,
    height = 600,
  } = config;

  // Calculate appropriate number of samples based on display width for smooth curves
  // Using a higher density than the physical pixels for better visual quality
  const SAMPLE_DENSITY = 5; // samples per pixel for high resolution
  const plotWidthPx =
    (typeof width === "number" ? width : parseInt(width as string, 10)) - 120; // Accounting for margins
  const samples = Math.ceil(SAMPLE_DENSITY * plotWidthPx);

  // For very steep functions, we might need even more samples
  // This provides virtually continuous plotting for continuous functions
  const MIN_SAMPLES = 500; // Minimum number of samples for any plot
  const finalSamples = Math.max(samples, MIN_SAMPLES);

  // Get min/max values from ranges
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  // Chart margins
  const margin = { top: 50, right: 50, bottom: 60, left: 70 };
  const plotWidth =
    (typeof width === "number" ? width : parseInt(width as string, 10)) -
    margin.left -
    margin.right;
  const plotHeight =
    (typeof height === "number" ? height : parseInt(height as string, 10)) -
    margin.top -
    margin.bottom;

  // Helper function to get variable precision
  const getVariablePrecision = (variableName: string): number => {
    const varId = `var-${variableName}`;
    const variable = computationStore.variables.get(varId);
    return variable?.precision ?? 2; // Default to 2 decimal places if not specified
  };

  // Helper function to format a number with variable precision
  const formatVariableValue = (value: number, variableName: string): string => {
    return value.toFixed(getVariablePrecision(variableName));
  };

  // Helper function to get variable label from computation store
  const getVariableLabel = (variableName: string): string => {
    const varId = `var-${variableName}`;
    const variable = computationStore.variables.get(varId);
    return variable?.label || variableName; // Fallback to variable name if no label
  };

  // Get variable value from computation store
  const getVariableValue = (variableName: string): number => {
    // First try to get value through binding system if it's been registered
    try {
      // This would use the binding system in a full implementation
      // For now, we'll continue to use the computation store directly
      const varId = `var-${variableName}`;
      const variable = computationStore.variables.get(varId);
      return variable?.value ?? 0;
    } catch (error) {
      // Fallback to direct computation store access
      const varId = `var-${variableName}`;
      const variable = computationStore.variables.get(varId);
      return variable?.value ?? 0;
    }
  };

  // Get or create evaluation function with enhanced validation for example transitions
  const getEvaluationFunction = ():
    | ((variables: Record<string, number>) => Record<string, number>)
    | null => {
    const debugState = computationStore.getDebugState();
    const currentCode = debugState.lastGeneratedCode;

    if (!currentCode) {
      console.warn("⚠️ No generated code available in computation store");
      return null;
    }

    // Check for cached function with validation
    if (
      evalFunctionRef.current &&
      currentCode === lastGeneratedCodeRef.current
    ) {
      // Validate the cached function is still working
      try {
        const testResult = evalFunctionRef.current({ x: 0 });
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
        const testResult = newFunc({ x: 0 });
        if (!testResult || typeof testResult !== "object") {
          console.error("❌ New evaluation function returned invalid result");
          return null;
        }
      } catch (testError) {
        console.error("❌ New evaluation function failed test:", testError);
        return null;
      }

      // Update the local cache
      evalFunctionRef.current = newFunc;
      lastGeneratedCodeRef.current = currentCode;

      return newFunc;
    } catch (error) {
      console.error("❌ Error creating evaluation function:", error);
      return null;
    }
  };

  // Function to calculate data points for the plot without triggering OpenAI API calls
  const calculateDataPoints = () => {
    console.log("📈 Recalculating data points for plot");

    try {
      // Get the cached evaluation function (or create a new one if needed)
      // This is critical - we need to make sure we're not triggering API calls
      const localEvalFunction = getEvaluationFunction();

      // Verify we have a valid evaluation function
      if (!localEvalFunction) {
        console.warn(
          "⚠️ No evaluation function available - cannot generate plot"
        );
        return;
      }

      console.log("✅ Using cached evaluation function for plot generation");

      // Cache key variables for the plot
      const mValue = getVariableValue("m");
      console.log(`🏋️ Using mass value: ${mValue} for plot generation`);

      // Generate evenly spaced x values across the domain
      const xValues: number[] = [];
      const step = (xMax - xMin) / finalSamples;
      for (let i = 0; i <= finalSamples; i++) {
        xValues.push(xMin + i * step);
      }

      console.log(
        `📊 Generating ${finalSamples} samples for virtually continuous plotting`
      );

      // Generate plot points WITHOUT modifying the computation store
      const points: DataPoint[] = [];

      // IMPORTANT: Take a SNAPSHOT of all current variable values
      // This prevents us from modifying the original variables
      const variablesMap: Record<string, number> = {};
      for (const [id, variable] of computationStore.variables.entries()) {
        // Extract the variable symbol from id (remove 'var-' prefix)
        const symbol = variable.symbol;
        variablesMap[symbol] = variable.value;
      }

      // For each x value, calculate the y value using the CACHED evaluation function
      // We use a local function to avoid triggering API calls through computationStore
      for (const x of xValues) {
        // IMPORTANT: Create a NEW copy for each calculation to avoid mutation
        // This prevents any changes to the original store's variables
        const calculationVars = { ...variablesMap };

        // Set x-axis variable for this point calculation
        calculationVars[xVar] = x;

        try {
          // CRITICAL: Run the LOCAL cached evaluation function
          // This is completely isolated from the computationStore
          // and will never trigger API calls
          const result = localEvalFunction(calculationVars);

          // Enhanced validation for result
          if (!result || typeof result !== "object") {
            console.warn(`⚠️ Invalid result type at x=${x}`);
            continue;
          }

          // First try to get the Y value using the configured yVar
          let y = result[yVar];

          // If we couldn't find the value using the configured variable name,
          // try to extract and use common dependent variable names
          if (y === undefined || typeof y !== "number" || !isFinite(y)) {
            // Try common variable names that might be in the result
            const possibleYVars = ["y", "z", "result", "output"];
            for (const varName of possibleYVars) {
              if (
                result[varName] !== undefined &&
                typeof result[varName] === "number" &&
                isFinite(result[varName])
              ) {
                y = result[varName];
                break;
              }
            }
          }

          // Only include points that are valid and within bounds
          if (
            typeof y === "number" &&
            !isNaN(y) &&
            isFinite(y) &&
            x >= xMin &&
            x <= xMax &&
            y >= yMin &&
            y <= yMax
          ) {
            points.push({ x, y });
          }
        } catch (error) {
          // Reduce console spam - only log first few errors and summary
          if (points.length < 5) {
            console.warn(`⚠️ Error calculating point at x=${x}:`, error);
          }
        }
      }

      // Get the CURRENT point based on the UI state for highlighting
      const currentX = getVariableValue(xVar);
      const currentY = getVariableValue(yVar);

      // Ensure we have numeric values
      const currentXNum =
        typeof currentX === "number"
          ? currentX
          : parseFloat(String(currentX)) || 0;
      const currentYNum =
        typeof currentY === "number"
          ? currentY
          : parseFloat(String(currentY)) || 0;

      console.log(
        ` Current point: (${formatVariableValue(currentXNum, xVar)}, ${formatVariableValue(currentYNum, yVar)})`
      );
      console.log(
        `📊 Generated ${points.length} data points without OpenAI API calls`
      );

      // Update the state with new data points and current point
      setCurrentPoint({ x: currentXNum, y: currentYNum });
      setDataPoints(points);
    } catch (error) {
      console.error("❌ Error calculating plot data points:", error);
    }
  };

  // Monitor config changes and recalculate when API specification changes
  useEffect(() => {
    console.log("📊 Plot configuration changed:", {
      title,
      xVar,
      xRange,
      yVar,
      yRange,
      samples,
      dimensions: { width, height, plotWidth, plotHeight },
    });

    // Clear existing data points to force re-render
    setDataPoints([]);
    setCurrentPoint(null);

    // Force immediate re-render of the SVG
    if (svgRef.current) {
      d3.select(svgRef.current).selectAll("*").remove();
    }

    // Schedule a recalculation with the new configuration
    // Delay slightly to ensure any related state changes have propagated
    setTimeout(() => {
      console.log("⏱️ Recalculating data points after configuration change");
      calculateDataPoints();
    }, 50);
  }, [
    // Explicitly list every property of the config to ensure any change triggers a recalculation
    config.type,
    config.title,
    config.xVar,
    config.xRange,
    config.yVar,
    config.yRange,
    config.width,
    config.height,
  ]);

  // Set up reaction to recalculate when any variable changes
  useEffect(() => {
    console.log("🔄 Setting up reaction for plot updates");

    // Track number of updates to prevent excessive logging
    let updateCount = 0;
    const LOG_INTERVAL = 5; // Only log every 5 updates

    // This reaction is the CRITICAL component that makes the visualization dynamic
    const disposer = reaction(
      // This function returns the data to track for changes
      () => {
        // We ONLY need to track specific variables that affect the plot,
        // not all variables in the store. This is much more efficient.

        // Get only the variables we care about
        const relevantVariables = new Set([
          "var-m", // Mass - affects the y-values
          `var-${xVar}`, // X-axis variable
          `var-${yVar}`, // Y-axis variable
        ]);

        // Extract just the values we need
        const trackedValues: Record<string, number> = {};

        Array.from(computationStore.variables.entries())
          .filter(([id]) => relevantVariables.has(id))
          .forEach(([id, v]) => {
            trackedValues[id] = v.value;
          });

        // Log only occasionally to prevent excessive logging
        updateCount++;
        if (updateCount % LOG_INTERVAL === 0) {
          console.log("⚡ Reaction checking variables:", trackedValues);
        }

        // Return a simpler object that only includes what we need to track
        return {
          // Track m value which affects ALL y-values (scaling factor)
          m: trackedValues["var-m"] ?? 0,

          // Only track the current values of x and y axis variables
          // for current point highlighting - we don't need to track
          // every variable to calculate the curve
          xAxisValue: getVariableValue(xVar),
          yAxisValue: getVariableValue(yVar),

          // Track the function code so we rerender if the function changes
          functionHash: computationStore.lastGeneratedCode
            ? computationStore.lastGeneratedCode.substring(0, 20)
            : "none",
        };
      },
      // This function runs when tracked values change
      (newValues, oldValues) => {
        // Only log occasionally to prevent console spam
        if (updateCount % LOG_INTERVAL === 0) {
          console.log("🔄 Variable values changed - recalculating plot");
          if (oldValues) {
            console.log(
              "  Changed values:",
              Object.entries(newValues)
                .filter(
                  ([k, v]) => oldValues[k as keyof typeof oldValues] !== v
                )
                .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
            );
          }
        }

        // Recalculate all data points with current variable values
        calculateDataPoints();
      },
      // Configure the reaction for immediate response and efficiency
      {
        fireImmediately: true, // Run immediately on setup
        equals: (prev, next) => {
          // Custom equality function that only checks values we care about
          // This prevents unnecessary recalculations when unrelated variables change
          return (
            prev.m === next.m &&
            prev.xAxisValue === next.xAxisValue &&
            prev.yAxisValue === next.yAxisValue &&
            prev.functionHash === next.functionHash
          );
        },
      }
    );

    // Cleanup the reaction when component unmounts
    return () => {
      console.log("🧹 Cleaning up plot reaction");
      disposer();
    };
  }, []);

  // Draw plot when data points change
  useEffect(() => {
    if (!svgRef.current || dataPoints.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG container
    const svg = d3
      .select(svgRef.current)
      .attr("width", plotWidth + margin.left + margin.right)
      .attr("height", plotHeight + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, plotWidth]);

    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([plotHeight, 0]);

    // Add X axis
    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${plotHeight})`)
      .call(d3.axisBottom(xScale))
      .append("text")
      .attr("class", "axis-label")
      .attr("x", plotWidth / 2)
      .attr("y", 40)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text(getVariableLabel(xVar));

    // Add Y axis
    svg
      .append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -plotHeight / 2)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text(getVariableLabel(yVar));

    // Add grid lines (optional)
    svg
      .append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-plotWidth)
          .tickFormat(() => "")
      );

    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${plotHeight})`)
      .attr("opacity", 0.1)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-plotHeight)
          .tickFormat(() => "")
      );

    // Create line generator for smooth, continuous curves
    const line = d3
      .line<DataPoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveBasis); // Higher quality smooth curve for continuous functions

    // Add the line path
    svg
      .append("path")
      .datum(dataPoints)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Add an invisible overlay for hover interaction
    const focus = svg
      .append("g")
      .attr("class", "focus")
      .style("display", "none");

    focus.append("circle").attr("r", 5).attr("fill", "#3b82f6");

    // Create tooltip
    const tooltip = d3
      .select(tooltipRef.current)
      .attr("class", "tooltip")
      .style("display", "none")
      .style("position", "absolute")
      .style("background", "rgba(255, 255, 255, 0.9)")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
      .style("pointer-events", "none")
      .style("font-size", "12px");

    // Add the current point highlight
    if (
      currentPoint &&
      currentPoint.x >= xMin &&
      currentPoint.x <= xMax &&
      currentPoint.y >= yMin &&
      currentPoint.y <= yMax
    ) {
      svg
        .append("circle")
        .attr("class", "current-point")
        .attr("cx", xScale(currentPoint.x))
        .attr("cy", yScale(currentPoint.y))
        .attr("r", 6)
        .attr("fill", "#ef4444")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      // Add a label for the current point
      svg
        .append("text")
        .attr("class", "current-point-label")
        .attr("x", xScale(currentPoint.x) + 10)
        .attr("y", yScale(currentPoint.y) - 10)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .text(
          `${getVariableLabel(xVar)}: ${formatVariableValue(Number(currentPoint.x), xVar)}, ${getVariableLabel(yVar)}: ${formatVariableValue(Number(currentPoint.y), yVar)}`
        );
    }

    // Create a rect to capture mouse events
    svg
      .append("rect")
      .attr("width", plotWidth)
      .attr("height", plotHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        focus.style("display", null);
        tooltip.style("display", null);
      })
      .on("mouseout", () => {
        focus.style("display", "none");
        tooltip.style("display", "none");
      })
      .on("mousemove", (event) => {
        const [mouseX, mouseY] = d3.pointer(event);

        // Convert mouse position to domain values
        const x0 = xScale.invert(mouseX);

        // Find the nearest data point
        const bisect = d3.bisector((d: DataPoint) => d.x).left;
        const i = bisect(dataPoints, x0, 1);
        const d0 = dataPoints[i - 1];
        const d1 = dataPoints[i];

        if (!d0 || !d1) return;

        const d = x0 - d0.x > d1.x - x0 ? d1 : d0;

        focus.attr("transform", `translate(${xScale(d.x)},${yScale(d.y)})`);

        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 30}px`)
          .html(
            `${getVariableLabel(xVar)}: ${formatVariableValue(Number(d.x), xVar)}<br>${getVariableLabel(yVar)}: ${formatVariableValue(Number(d.y), yVar)}`
          );
      })
      .on("click", (event) => {
        const [mouseX] = d3.pointer(event);
        const x0 = xScale.invert(mouseX);

        // Update the x-axis variable when user clicks on the plot
        try {
          const xVarId = `var-${xVar}`;
          console.log(`📊 User clicked on graph, setting ${xVar} = ${x0}`);
          // Use runInAction to comply with MobX strict mode
          runInAction(() => {
            computationStore.setValue(xVarId, x0);
          });
        } catch (error) {
          console.error(`Error updating variable:`, error);
        }
      });
  }, [
    dataPoints,
    currentPoint,
    width,
    height,
    margin,
    xMin,
    xMax,
    yMin,
    yMax,
    plotWidth,
    plotHeight,
    xVar,
    yVar,
  ]);

  return (
    <div className="formulize-plot2d" style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
          overflow: "visible",
        }}
      />
      <div ref={tooltipRef} className="tooltip" />
    </div>
  );
});

export default Plot2D;
