/**
 * Formulize API
 *
 * This provides a declarative API for creating interactive formula visualizations
 * as described in the Formulize API Documentation.
 */

import { AugmentedFormula, deriveAugmentedFormula } from "../FormulaTree";
import { computationStore } from "../computation";
import { canonicalizeFormula } from "../formulaTransformations";
import { formulaStore } from "../store";

// Type definitions for the Formulize API
export interface FormulizeFormula {
  expression: string;
  id?: string;
  description?: string;
  displayMode?: "block" | "inline";
  variables: Record<string, FormulizeVariable>;
  computation?: FormulizeComputation;
}

export interface FormulizeVariableBind {
  source?: {
    component: string;
    property: string;
  };
  direction?: "bidirectional" | "to-target";
  transform?: (value: any) => any;
  reverseTransform?: (value: any) => any;
  condition?: (context: any) => boolean;
}

export interface FormulizeVariable {
  type: "constant" | "input" | "dependent";
  value?: number | string | boolean;
  dataType?: "scalar" | "vector" | "matrix";
  dimensions?: number[];
  units?: string;
  label?: string;
  precision?: number;
  description?: string;
  range?: [number, number];
  step?: number;
  options?: string[];
  bind?: FormulizeVariableBind;
}

export interface FormulizeComputation {
  engine: "symbolic-algebra" | "llm" | "manual";
  formula?: string;
  mappings?: Record<string, (...args: unknown[]) => unknown>;
  apiKey?: string;
  model?: string;
}

// Visualization type definitions
export interface FormulizeVisualization {
  type: 'plot2d' | string;
  config: FormulizePlot2D;
}

export interface FormulizePlot2D {
  type: 'plot2d';
  title?: string;
  xAxis: {
    variable: string;
    label?: string;
    min?: number;
    max?: number;
  };
  yAxis: {
    variable: string;
    label?: string;
    min?: number;
    max?: number;
  };
  width?: number | string;
  height?: number | string;
}

export interface FormulizeBinding {
  source: {
    component: string;
    property: string;
  };
  target: {
    component: string;
    property: string;
  };
  direction?: "bidirectional" | "to-target";
  transform?: (value: any) => any;
  reverseTransform?: (value: any) => any;
  condition?: (context: any) => boolean;
}

export interface FormulizeConfig {
  formula: FormulizeFormula;
  externalControls?: unknown[];
  visualizations?: FormulizeVisualization[];
  bindings?: FormulizeBinding[];
}

/**
 * Interface for the object returned by Formulize.create()
 */
export interface FormulizeInstance {
  formula: FormulizeFormula;
  getVariable: (name: string) => { name: string, value: number | string | boolean | unknown, type: string };
  setVariable: (name: string, value: number) => boolean;
  update: (config: FormulizeConfig) => Promise<void>;
  destroy: () => void;
}

// Internal mapping of variable types to computation store types
function mapVariableType(
  type: "constant" | "input" | "dependent"
): "fixed" | "slidable" | "dependent" | "none" {
  switch (type) {
    case "constant":
      return "fixed";
    case "input":
      return "slidable";
    case "dependent":
      return "dependent";
    default:
      return "none";
  }
}

/**
 * Creates an interactive formula visualization from a Formulize specification
 * 
 * @param config The Formulize configuration object
 * @param container Optional container element ID to render into
 * @returns A Formulize instance with methods to interact with the rendered formula
 */
// Import binding system
import { bindingSystem } from './BindingSystem';

async function create(config: FormulizeConfig, container?: string): Promise<FormulizeInstance> {
  try {
    // For now, we only support the formula part
    const { formula, visualizations, externalControls, bindings } = config;

    // Validate the formula
    if (!formula) {
      throw new Error("No formula defined in configuration");
    }

    if (!formula.expression) {
      throw new Error("No expression defined in formula");
    }

    if (!formula.variables) {
      throw new Error("No variables defined in formula");
    }

    // CRITICAL: Reset all state to ensure we start fresh
    // Clear computation store variables and state
    computationStore.variables.clear();
    computationStore.formula = "";
    computationStore.setLastGeneratedCode(null);
    computationStore.setFormulaError(null);
    computationStore.variableTypesChanged = 0;

    // Clear the formula store with an empty formula
    formulaStore.updateFormula(new AugmentedFormula([]));

    console.log("🧹 State cleared completely for new formula");

    // Now parse and set up the new formula
    const augmentedFormula = deriveAugmentedFormula(formula.expression);
    const canonicalFormula = canonicalizeFormula(augmentedFormula);

    // Set the formula in the store
    formulaStore.updateFormula(canonicalFormula);

    console.log("🔄 Setting up new variables from formula config");

    // Register formula with binding system
    const formulaId = formula.id || "default-formula";
    bindingSystem.registerComponent(
      formulaId,
      'formula',
      formula,
      formula.variables
    );

    // Add variables to computation store from the configuration
    Object.entries(formula.variables).forEach(([varName, variable]) => {
      const symbol = varName.replace(/\$/g, "");
      const varId = `var-${symbol}`;

      console.log(`➕ Adding variable ${varId} (${symbol}) of type ${variable.type}`);

      // Add variable to computation store
      computationStore.addVariable(varId, symbol);

      // Map variable types to computation store types
      const type = mapVariableType(variable.type);
      computationStore.setVariableType(varId, type);

      // Set initial value if provided
      if (variable.value !== undefined) {
        console.log(`⚙️ Setting initial value for ${varId}: ${variable.value}`);
        computationStore.setValue(varId, variable.value);
      }

      // Process variable local bindings if they exist
      if (variable.bind) {
        bindingSystem.registerLocalBinding(
          formulaId,
          varName,
          variable.bind
        );
      }
    });

    // Set up the computation engine if specified
    if (formula.computation) {
      console.log(`🧮 Setting computation engine to: ${formula.computation.engine}`);
      computationStore.computationEngine = formula.computation.engine;
      computationStore.computationConfig = formula.computation;
    } else {
      // Default to LLM engine if not specified
      computationStore.computationEngine = "llm";
      computationStore.computationConfig = null;
    }

    // Set the formula for computation
    console.log("📝 Setting formula in computation store:", formula.expression);
    await computationStore.setFormula(formula.expression);
    
    // Set up visualizations if provided
    if (visualizations && visualizations.length > 0) {
      console.log(`🔍 Setting up ${visualizations.length} visualizations`);
      
      visualizations.forEach((viz, index) => {
        const vizId = viz.id || `viz-${index}`;
        
        // Register visualization with binding system
        bindingSystem.registerComponent(
          vizId,
          'visualization',
          viz,
          viz.config
        );
        
        // Process visualization bindings
        bindingSystem.processVisualizationBindings(vizId, viz);
      });
    }
    
    // Set up external controls if provided
    if (externalControls && externalControls.length > 0) {
      console.log(`🎛️ Setting up ${externalControls.length} external controls`);
      
      // Would register controls similarly to visualizations
      // This would be implemented similarly to visualization binding
    }
    
    // Set up global bindings if provided
    if (bindings && bindings.length > 0) {
      console.log(`🔗 Setting up ${bindings.length} global bindings`);
      bindingSystem.setGlobalBindings(bindings);
    }
    
    // Return an API object for future interactions
    return {
      formula,
      getVariable: (name: string) => {
        const varId = `var-${name}`;
        const variable = computationStore.variables.get(varId);
        return {
          name,
          value: variable?.value ?? 0,
          type: formula.variables[name].type
        };
      },
      setVariable: (name: string, value: number) => {
        const varId = `var-${name}`;
        if (formula.variables[name].type !== "dependent") {
          computationStore.setValue(varId, value);
          
          // Also update through binding system to propagate changes
          bindingSystem.updateProperty(formulaId, name, value);
          
          return true;
        }
        return false;
      },
      update: async (updatedConfig: FormulizeConfig) => {
        // Recreate the formula with the updated config
        const newInstance = await create(updatedConfig, container);
        Object.assign(this, newInstance);
      },
      destroy: () => {
        // Reset with an empty formula
        formulaStore.updateFormula(new AugmentedFormula([]));
      }
    };
  } catch (error) {
    console.error("Error creating formula:", error);
    throw error;
  }
}

// Export the Formulize API
const Formulize = {
  create
};

export default Formulize;