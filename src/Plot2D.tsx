import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FormulizePlot2D } from './api';
import { computationStore } from './computation';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';

interface Plot2DProps {
  config: FormulizePlot2D;
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
  const evalFunctionRef = useRef<Function | null>(null);
  const lastGeneratedCodeRef = useRef<string | null>(null);
  
  // Parse configuration options with defaults
  const {
    title = '',
    xAxis,
    yAxis, 
    samples = 200,
    width = 800,
    height = 500
  } = config;
  
  // Get min/max values or derive from range if not specified
  const xMin = xAxis.min ?? 0;
  const xMax = xAxis.max ?? 10;
  const yMin = yAxis.min ?? 0;
  const yMax = yAxis.max ?? 100;

  // Chart margins
  const margin = { top: 50, right: 50, bottom: 60, left: 70 };
  const plotWidth = (typeof width === 'number' ? width : parseInt(width as string, 10)) - margin.left - margin.right;
  const plotHeight = (typeof height === 'number' ? height : parseInt(height as string, 10)) - margin.top - margin.bottom;

  // Function to get variable value from computation store
  const getVariableValue = (variableName: string): number => {
    const varId = `var-${variableName}`;
    const variable = computationStore.variables.get(varId);
    return variable?.value ?? 0;
  };
  
  // Function to get or create a cached evaluation function
  // This specialized version is designed to not trigger API calls
  const getEvaluationFunction = (): Function | null => {
    const debugState = computationStore.getDebugState();
    const currentCode = debugState.lastGeneratedCode;

    // If we have no code, we can't create a function
    if (!currentCode) {
      console.warn("⚠️ No generated code available in computation store");
      return null;
    }

    // CRITICAL: Check for our local cache first - this is the safest option
    // that won't accidentally trigger any API calls
    if (evalFunctionRef.current && currentCode === lastGeneratedCodeRef.current) {
      console.log("✅ Using SAFELY cached evaluation function from component ref");
      return evalFunctionRef.current;
    }

    // Next try to get the existing function from computationStore
    // This should be safe as we're just accessing the property, not calling any methods
    const hasFunction = debugState.hasFunction;
    if (hasFunction) {
      // Get the evaluationFunction directly from its accessor getter
      // We need to be careful to avoid calling any methods that might trigger API calls
      const storeFunction = (computationStore as any).evaluationFunction;
      if (storeFunction) {
        console.log("✅ Using direct evaluation function from computation store");
        // Save to our local cache for future use
        evalFunctionRef.current = storeFunction;
        lastGeneratedCodeRef.current = currentCode;
        return storeFunction;
      }
    }

    // Create a new evaluation function and cache it locally
    // This is a safe approach that won't make any API calls
    try {
      console.log("🔄 Creating LOCAL evaluation function from generated code");
      console.log("🔄 This does NOT make an API call - just creating a function from the existing code");

      const newFunc = new Function(
        'variables',
        `"use strict";\n${currentCode}\nreturn evaluate(variables);`
      );

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
        console.warn("⚠️ No evaluation function available - cannot generate plot");
        return;
      }

      console.log("✅ Using cached evaluation function for plot generation");

      // Cache key variables for the plot
      const mValue = getVariableValue("m");
      console.log(`🏋️ Using mass value: ${mValue} for plot generation`);

      // Generate evenly spaced x values across the domain
      const xValues: number[] = [];
      const step = (xMax - xMin) / samples;
      for (let i = 0; i <= samples; i++) {
        xValues.push(xMin + i * step);
      }

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
        const calculationVars = {...variablesMap};

        // Set x-axis variable for this point calculation
        calculationVars[xAxis.variable] = x;

        try {
          // CRITICAL: Run the LOCAL cached evaluation function
          // This is completely isolated from the computationStore
          // and will never trigger API calls
          const result = localEvalFunction(calculationVars);

          // First try to get the Y value using the configured yAxis.variable
          let y = result[yAxis.variable];

          // If we couldn't find the value using the configured variable name,
          // try to extract and use the actual dependent variable from the formula
          if (y === undefined) {
            // Parse the formula to identify the dependent variable (left side of equation)
            const formula = computationStore.formula;
            const formulaMatch = formula.match(/^\s*([A-Za-z])\s*=/);
            const formulaDepVar = formulaMatch ? formulaMatch[1] : null;

            if (formulaDepVar && result[formulaDepVar] !== undefined) {
              console.log(`📊 Using formula-defined dependent variable ${formulaDepVar} instead of configured ${yAxis.variable}`);
              y = result[formulaDepVar];
            }
          }

          if (typeof y === 'number' && !isNaN(y)) {
            points.push({ x, y });
          }
        } catch (error) {
          console.warn(`⚠️ Error calculating point at x=${x}:`, error);
        }
      }

      // Get the CURRENT point based on the UI state for highlighting
      const currentX = getVariableValue(xAxis.variable);
      const currentY = getVariableValue(yAxis.variable);

      console.log(`🎯 Current point: (${currentX.toFixed(2)}, ${currentY.toFixed(2)})`);
      console.log(`📊 Generated ${points.length} data points without OpenAI API calls`);

      // Update the state with new data points and current point
      setCurrentPoint({ x: currentX, y: currentY });
      setDataPoints(points);
    } catch (error) {
      console.error("❌ Error calculating plot data points:", error);
    }
  };

  // Monitor config changes and recalculate when API specification changes
  useEffect(() => {
    console.log("📊 Plot configuration changed:", {
      title,
      xAxis: xAxis ? { variable: xAxis.variable, min: xMin, max: xMax } : null,
      yAxis: yAxis ? { variable: yAxis.variable, min: yMin, max: yMax } : null,
      samples,
      dimensions: { width, height, plotWidth, plotHeight }
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
    config.xAxis?.variable,
    config.xAxis?.label,
    config.xAxis?.min,
    config.xAxis?.max,
    config.yAxis?.variable,
    config.yAxis?.label,
    config.yAxis?.min,
    config.yAxis?.max,
    config.samples,
    config.width,
    config.height
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
          'var-m',                  // Mass - affects the y-values
          `var-${xAxis.variable}`,  // X-axis variable
          `var-${yAxis.variable}`   // Y-axis variable
        ]);

        // Extract just the values we need
        const trackedValues = {};

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
          m: trackedValues['var-m'],

          // Only track the current values of x and y axis variables
          // for current point highlighting - we don't need to track
          // every variable to calculate the curve
          xAxisValue: getVariableValue(xAxis.variable),
          yAxisValue: getVariableValue(yAxis.variable),

          // Track the function code so we rerender if the function changes
          functionHash: computationStore.lastGeneratedCode ?
            computationStore.lastGeneratedCode.substring(0, 20) : 'none'
        };
      },
      // This function runs when tracked values change
      (newValues, oldValues) => {
        // Only log occasionally to prevent console spam
        if (updateCount % LOG_INTERVAL === 0) {
          console.log("🔄 Variable values changed - recalculating plot");
          console.log("  Changed values:",
            Object.entries(newValues)
              .filter(([k, v]) => oldValues[k] !== v)
              .reduce((acc, [k, v]) => ({...acc, [k]: v}), {})
          );
        }

        // Recalculate all data points with current variable values
        calculateDataPoints();
      },
      // Configure the reaction for immediate response and efficiency
      {
        fireImmediately: true,   // Run immediately on setup
        equals: (prev, next) => {
          // Custom equality function that only checks values we care about
          // This prevents unnecessary recalculations when unrelated variables change
          return prev.m === next.m &&
                 prev.xAxisValue === next.xAxisValue &&
                 prev.yAxisValue === next.yAxisValue &&
                 prev.functionHash === next.functionHash;
        }
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
    const svg = d3.select(svgRef.current)
      .attr("width", plotWidth + margin.left + margin.right)
      .attr("height", plotHeight + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain([xMin, xMax])
      .range([0, plotWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([plotHeight, 0]);
    
    // Add X axis
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${plotHeight})`)
      .call(d3.axisBottom(xScale))
      .append("text")
      .attr("class", "axis-label")
      .attr("x", plotWidth / 2)
      .attr("y", 40)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text(xAxis.label || xAxis.variable);
    
    // Add Y axis
    svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -plotHeight / 2)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .text(yAxis.label || yAxis.variable);
    
    // Add title
    if (title) {
      svg.append("text")
        .attr("class", "title")
        .attr("x", plotWidth / 2)
        .attr("y", -margin.top / 2)
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text(title);
    }
    
    // Add grid lines (optional)
    svg.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(d3.axisLeft(yScale)
        .tickSize(-plotWidth)
        .tickFormat(() => "")
      );
    
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${plotHeight})`)
      .attr("opacity", 0.1)
      .call(d3.axisBottom(xScale)
        .tickSize(-plotHeight)
        .tickFormat(() => "")
      );
    
    // Create line generator
    const line = d3.line<DataPoint>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y))
      .curve(d3.curveMonotoneX); // Smoother curve
    
    // Add the line path
    svg.append("path")
      .datum(dataPoints)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("d", line);
    
    // Add an invisible overlay for hover interaction
    const focus = svg.append("g")
      .attr("class", "focus")
      .style("display", "none");
    
    focus.append("circle")
      .attr("r", 5)
      .attr("fill", "#3b82f6");
    
    // Create tooltip
    const tooltip = d3.select(tooltipRef.current)
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
    if (currentPoint && 
        currentPoint.x >= xMin && currentPoint.x <= xMax && 
        currentPoint.y >= yMin && currentPoint.y <= yMax) {
      
      svg.append("circle")
        .attr("class", "current-point")
        .attr("cx", xScale(currentPoint.x))
        .attr("cy", yScale(currentPoint.y))
        .attr("r", 6)
        .attr("fill", "#ef4444")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
      
      // Add a label for the current point
      svg.append("text")
        .attr("class", "current-point-label")
        .attr("x", xScale(currentPoint.x) + 10)
        .attr("y", yScale(currentPoint.y) - 10)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .text(`${xAxis.label || xAxis.variable}: ${currentPoint.x.toFixed(2)}, ${yAxis.label || yAxis.variable}: ${currentPoint.y.toFixed(2)}`);
    }
    
    // Create a rect to capture mouse events
    svg.append("rect")
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
          .html(`${xAxis.label || xAxis.variable}: ${d.x.toFixed(2)} ${xAxis.label ? `(${xAxis.variable})` : ''}<br>${yAxis.label || yAxis.variable}: ${d.y.toFixed(2)} ${yAxis.label ? `(${yAxis.variable})` : ''}`);
      })
      .on("click", (event) => {
        const [mouseX] = d3.pointer(event);
        const x0 = xScale.invert(mouseX);

        // Set the input variable to the clicked value
        // This is a legitimate use of setValue - it's user-initiated
        const xVarId = `var-${xAxis.variable}`;
        console.log(`📊 User clicked on graph, setting ${xAxis.variable} = ${x0}`);
        computationStore.setValue(xVarId, x0);
      });
      
  }, [dataPoints, currentPoint, width, height, margin, xMin, xMax, yMin, yMax, plotWidth, plotHeight, xAxis, yAxis, title]);

  return (
    <div className="formulize-plot2d" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        style={{ 
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          overflow: 'visible'
        }}
        className="bg-white border rounded shadow-sm"
      />
      <div ref={tooltipRef} className="tooltip" />
    </div>
  );
});

export default Plot2D;