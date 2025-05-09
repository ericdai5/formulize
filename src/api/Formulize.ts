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
  bind?: unknown; // For future binding support
}

export interface FormulizeComputation {
  engine: "symbolic-algebra" | "llm" | "manual";
  formula?: string;
  mappings?: Record<string, (...args: unknown[]) => unknown>;
  apiKey?: string;
  model?: string;
}

export interface FormulizeConfig {
  formula: FormulizeFormula;
  externalControls?: unknown[];
  visualizations?: unknown[];
  bindings?: unknown[];
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
async function create(config: FormulizeConfig, container?: string): Promise<FormulizeInstance> {
  try {
    // For now, we only support the formula part
    const { formula } = config;
    
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
    
    // Parse the formula to get an augmented formula object
    const augmentedFormula = deriveAugmentedFormula(formula.expression);
    const canonicalFormula = canonicalizeFormula(augmentedFormula);
    
    // Set the formula in the store
    formulaStore.updateFormula(canonicalFormula);
    
    // Add variables to computation store
    Object.entries(formula.variables).forEach(([varName, variable]) => {
      const symbol = varName.replace(/\$/g, "");
      const varId = `var-${symbol}`;
      
      // Add variable to computation store
      computationStore.addVariable(varId, symbol);
      
      // Map variable types to computation store types
      const type = mapVariableType(variable.type);
      computationStore.setVariableType(varId, type);
      
      // Set initial value if provided
      if (variable.value !== undefined) {
        computationStore.setValue(varId, variable.value);
      }
    });
    
    // Set the formula for computation
    console.log("Setting formula in computation store:", formula.expression);
    await computationStore.setFormula(formula.expression);
    
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