import { useEffect, useRef, useState } from "react";

import BlockInteractivity from "./BlockInteractivity";
import { Formulize, FormulizeConfig, FormulizeFormula } from "./api";

interface DirectFormulaRendererProps {
  formulizeConfig?: FormulizeConfig;
  formulizeFormula?: FormulizeFormula;
  autoRender?: boolean;
  height?: number | string;
  width?: number | string;
  onConfigChange?: (config: FormulizeConfig) => void;
}

// Default Formulize formula configuration
const DEFAULT_FORMULIZE_FORMULA: FormulizeFormula = {
  expression: "K = \\frac{1}{2}mv^2",
  variables: {
    K: {
      type: "dependent",
      units: "J",
      label: "kinetic energy",
      precision: 2,
    },
    m: {
      type: "constant",
      value: 1,
      units: "kg",
      label: "mass",
    },
    v: {
      type: "input",
      value: 2,
      range: [0.1, 10],
      units: "m/s",
      label: "velocity",
    },
  },
};

const DirectFormulaRenderer = ({
  formulizeConfig = { formula: DEFAULT_FORMULIZE_FORMULA },
  formulizeFormula = DEFAULT_FORMULIZE_FORMULA,
  autoRender = true,
  height = 300,
  width = "100%",
  onConfigChange,
}: DirectFormulaRendererProps) => {
  // Use formulizeConfig if provided, otherwise use the formulizeFormula
  const initialConfig = formulizeConfig?.formula ? 
    formulizeConfig : 
    { formula: formulizeFormula };
  
  // Convert the config to a JavaScript format for display
  const configToJsString = (config: FormulizeConfig): string => {
    // Start with the actual JavaScript code template as specified in the Formulize API Documentation
    return `// Formulize configuration
// This JavaScript code is directly executed by the Formulize API
// Edit it to customize your formula and visualizations

// Define the configuration object
const config = {
  formula: {
    expression: "K = \\\\frac{1}{2}mv^2",
    variables: {
      K: {
        type: "dependent",
        units: "J",
        label: "Kinetic Energy",
        precision: 2
      },
      m: {
        type: "input",
        value: 1,
        range: [0.1, 10],
        units: "kg",
        label: "Mass"
      },
      v: {
        type: "input",
        value: 2,
        range: [0.1, 100],
        units: "m/s",
        label: "Velocity"
      }
    },
    computation: {
      // You can use "symbolic-algebra" or "llm" for computation
      engine: "symbolic-algebra",
      formula: "{K} = 0.5 * {m} * {v} * {v}"
    }
  },
  
  // Define visualizations
  visualizations: [
    {
      type: "plot2d",
      id: "energyPlot",
      config: {
        title: "Kinetic Energy vs. Velocity",
        xAxis: {
          variable: "v",
          label: "Velocity (m/s)",
          min: 0,
          max: 20
        },
        yAxis: {
          variable: "K",
          label: "Kinetic Energy (J)",
          min: 0,
          max: 200
        },
        width: 800,
        height: 500
      }
    }
  ],
  
  // Define bindings between components (optional)
  bindings: [
    // Example: Connect visualization point to formula variable
    // {
    //   source: { component: "energyPlot", property: "points[0].x" },
    //   target: { component: "formula", property: "v" },
    //   direction: "bidirectional"
    // }
  ]
};

// Create the Formulize instance with the configuration
// This line is required - it creates the formula and visualizations
const formula = await Formulize.create(config);
`;
  };

  const [formulizeInput, setFormulizeInput] = useState<string>(
    configToJsString(initialConfig)
  );
  const [isRendered, setIsRendered] = useState<boolean>(autoRender);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoRender) {
      renderFormula();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update the formula display when the config changes
  useEffect(() => {
    if (formulizeConfig !== initialConfig) {
      setFormulizeInput(configToJsString(formulizeConfig));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formulizeConfig, JSON.stringify(formulizeConfig)]);

  // Execute user-provided JavaScript code to get configuration
  const executeUserCode = async (jsCode: string): Promise<FormulizeConfig | null> => {
    try {
      // Prepare a secure environment for executing the code
      // In a real production environment, we would use a more secure approach
      // like sandboxed iframes or a server-side evaluation
      
      // Create a function that will wrap the code and return the config
      const wrappedCode = `
        // Mock the Formulize API calls so we can capture the config
        let capturedConfig = null;
        
        const Formulize = {
          create: async function(config) {
            // Make a deep copy to prevent any reference issues
            capturedConfig = JSON.parse(JSON.stringify(config));
            
            // Log the captured config for debugging
            console.log("Captured config:", capturedConfig);
            
            // Return a mock instance
            return {
              formula: config.formula,
              getVariable: () => ({}),
              setVariable: () => true,
              update: async () => {},
              destroy: () => {}
            };
          }
        };
        
        // Add global context for variables the code might use
        const console = window.console;
        const Math = window.Math;
        
        // Execute the user's code
        try {
          ${jsCode}
        } catch(e) {
          console.error("Error in user code:", e);
          throw e; // Re-throw to propagate error
        }
        
        if (!capturedConfig) {
          throw new Error("No configuration was captured. Make sure your code calls Formulize.create(config)");
        }
        
        // Return the captured config
        return capturedConfig;
      `;
      
      // Create a function from the wrapped code and execute it
      const executeFunction = new Function('return (async function() { ' + wrappedCode + ' })()');
      const result = await executeFunction();
      
      // Validate the config
      if (!result || !result.formula) {
        throw new Error("Invalid configuration returned. Configuration must include a formula property.");
      }
      
      // Log the fully extracted config
      console.log("Extracted configuration:", result);
      
      return result;
    } catch (error) {
      console.error("Error executing user code:", error);
      throw error; // Re-throw to show error in UI
    }
  };

  const renderFormula = async () => {
    try {
      setError(null);
      
      // Execute the user-provided JavaScript code
      const userConfig = await executeUserCode(formulizeInput);
      
      // Make sure we have a valid configuration
      if (!userConfig || !userConfig.formula) {
        throw new Error("Invalid configuration. Please check your code and try again.");
      }
      
      // Use the user config 
      let configToUse = userConfig;
      
      // Ensure the configToUse has all required properties
      if (!configToUse.formula.variables) {
        configToUse.formula.variables = {};
      }
      
      // Make sure we have a computation engine specified
      if (!configToUse.formula.computation) {
        console.log("No computation engine specified, defaulting to symbolic-algebra");
        configToUse.formula.computation = {
          engine: "symbolic-algebra",
          formula: configToUse.formula.expression.replace(/\\frac/g, '') // Simple cleanup for formula
        };
      }
      
      // Log the configuration for debugging
      console.log("Using config from user JavaScript:", configToUse);
      console.log("Formula computation engine:", configToUse.formula.computation.engine);

      // Create the formula using Formulize API
      try {
        const formulizeInstance = await Formulize.create(configToUse);

        // Store the config globally for access by other components
        window.__lastFormulizeConfig = configToUse;

        // Notify parent of config change via callback if provided
        if (onConfigChange) {
          console.log("📢 Notifying parent of configuration:", configToUse);
          onConfigChange(configToUse);
        }

        setIsRendered(true);
      } catch (e) {
        console.error("Formulize API error:", e);
        setError(`Failed to create formula: ${e instanceof Error ? e.message : String(e)}`);
      }
    } catch (err) {
      console.error("Error rendering formula:", err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Example formula configurations
  const formulaExamples = {
    kineticEnergy: `// Formulize configuration - Kinetic Energy Example
// This JavaScript code is directly executed by the Formulize API

const config = {
  formula: {
    expression: "K = \\\\frac{1}{2}mv^2",
    variables: {
      K: {
        type: "dependent",
        units: "J",
        label: "Kinetic Energy",
        precision: 2
      },
      m: {
        type: "input",
        value: 1,
        range: [0.1, 10],
        units: "kg",
        label: "Mass"
      },
      v: {
        type: "input",
        value: 2,
        range: [0.1, 100],
        units: "m/s",
        label: "Velocity"
      }
    },
    computation: {
      engine: "symbolic-algebra",
      formula: "{K} = 0.5 * {m} * {v} * {v}"
    }
  },
  
  visualizations: [
    {
      type: "plot2d",
      id: "energyPlot",
      config: {
        title: "Kinetic Energy vs. Velocity",
        xAxis: {
          variable: "v",
          label: "Velocity (m/s)",
          min: 0,
          max: 20
        },
        yAxis: {
          variable: "K",
          label: "Kinetic Energy (J)",
          min: 0,
          max: 200
        },
        width: 800,
        height: 500
      }
    }
  ]
};

// Create the Formulize instance with the configuration
const formula = await Formulize.create(config);`,

    gravitationalPotential: `// Formulize configuration - Gravitational Potential Energy Example
// This JavaScript code is directly executed by the Formulize API

const config = {
  formula: {
    expression: "U = mgh",
    variables: {
      U: {
        type: "dependent",
        units: "J",
        label: "Potential Energy",
        precision: 2
      },
      m: {
        type: "input",
        value: 1,
        range: [0.1, 100],
        units: "kg",
        label: "Mass"
      },
      g: {
        type: "input",
        value: 9.8,
        range: [1, 20],
        units: "m/s²",
        label: "Gravity"
      },
      h: {
        type: "input",
        value: 10,
        range: [0, 1000],
        units: "m",
        label: "Height"
      }
    },
    computation: {
      engine: "symbolic-algebra",
      formula: "{U} = {m} * {g} * {h}"
    }
  },
  
  visualizations: [
    {
      type: "plot2d",
      id: "potentialEnergyPlot",
      config: {
        title: "Potential Energy vs. Height",
        xAxis: {
          variable: "h",
          label: "Height (m)",
          min: 0,
          max: 100
        },
        yAxis: {
          variable: "U",
          label: "Potential Energy (J)",
          min: 0,
          max: 10000
        },
        width: 800,
        height: 500
      }
    }
  ]
};

// Create the Formulize instance with the configuration
const formula = await Formulize.create(config);`,

    quadraticEquation: `// Formulize configuration - Quadratic Equation Example
// This JavaScript code is directly executed by the Formulize API

const config = {
  formula: {
    expression: "y = ax^2 + bx + c",
    variables: {
      y: {
        type: "dependent",
        label: "y-value",
        precision: 2
      },
      x: {
        type: "input",
        value: 0,
        range: [-10, 10],
        step: 0.1,
        label: "x"
      },
      a: {
        type: "input",
        value: 1,
        range: [-5, 5],
        step: 0.1,
        label: "Coefficient a"
      },
      b: {
        type: "input",
        value: 0,
        range: [-10, 10],
        step: 0.1,
        label: "Coefficient b"
      },
      c: {
        type: "input",
        value: 0,
        range: [-10, 10],
        step: 0.1,
        label: "Coefficient c"
      }
    },
    computation: {
      engine: "symbolic-algebra",
      formula: "{y} = {a} * {x} * {x} + {b} * {x} + {c}"
    }
  },
  
  visualizations: [
    {
      type: "plot2d",
      id: "quadraticPlot",
      config: {
        title: "Quadratic Function",
        xAxis: {
          variable: "x",
          label: "x",
          min: -5,
          max: 5
        },
        yAxis: {
          variable: "y",
          label: "y",
          min: -10,
          max: 10
        },
        width: 800,
        height: 500
      }
    }
  ],
  
  bindings: [
    {
      source: { component: "quadraticPlot", property: "points[0].x" },
      target: { component: "formula", property: "x" },
      direction: "bidirectional"
    }
  ]
};

// Create the Formulize instance with the configuration
const formula = await Formulize.create(config);`,

  };

  // Handler for example button clicks
  const handleExampleClick = (example: string) => {
    setFormulizeInput(formulaExamples[example]);
    setIsRendered(false); // Show the code editor with the new example
  };

  return (
    <div className="formula-renderer border border-gray-200 rounded-lg overflow-hidden">
      {!isRendered ? (
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Formulize Definition</h2>
          
          {/* Example selector buttons */}
          <div className="mb-4 flex space-x-2 flex-wrap">
            <button
              onClick={() => handleExampleClick('kineticEnergy')}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm mr-2 mb-2"
            >
              Kinetic Energy Example
            </button>
            <button
              onClick={() => handleExampleClick('gravitationalPotential')}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm mr-2 mb-2"
            >
              Gravitational Potential Example
            </button>
            <button
              onClick={() => handleExampleClick('quadraticEquation')}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm mr-2 mb-2"
            >
              Quadratic Equation Example
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">
                Formulize Configuration (JavaScript):
              </label>
              <div className="text-sm text-gray-500">
                Edit this configuration to change the formula and visualizations
              </div>
            </div>
            <textarea
              value={formulizeInput}
              onChange={(e) => setFormulizeInput(e.target.value)}
              className="w-full p-2 border rounded font-mono text-sm h-80"
            />
          </div>

          <button
            onClick={renderFormula}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Render Formula
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center justify-between bg-gray-100 px-4 py-2">
            <h3 className="font-medium">Interactive Formula</h3>
            <button
              onClick={() => setIsRendered(false)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>

          <div
            ref={containerRef}
            style={{ height, width }}
            className="interactive-formula-container"
          >
            <BlockInteractivity />
          </div>

          <div className="p-2 bg-gray-50 text-xs text-gray-500">
            Drag input variables to see how they affect the dependent variables
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectFormulaRenderer;