/**
 * Formulize API
 *
 * This provides a declarative API for creating interactive formula visualizations
 * as described in the Formulize API Documentation.
 */
import { AugmentedFormula, deriveAugmentedFormula } from "../FormulaTree";
import { canonicalizeFormula } from "../formulaTransformations";
import { formulaStore } from "../store";
import { IFormula } from "../types/formula";
import { IPlot2D } from "../types/plot2d";
import { IPlot3D } from "../types/plot3d";
import { computationStore } from "./computation";

export interface FormulizeVisualization {
  type: "plot2d" | "plot3d" | string;
  config: IPlot2D | IPlot3D;
  id?: string;
}

export interface FormulizeConfig {
  formula: IFormula;
  externalControls?: unknown[];
  visualizations?: FormulizeVisualization[];
}

/**
 * Interface for the object returned by Formulize.create()
 */
export interface FormulizeInstance {
  formula: IFormula;
  getVariable: (name: string) => {
    name: string;
    value: number;
    type: string;
  };
  setVariable: (name: string, value: number) => boolean;
  update: (config: FormulizeConfig) => Promise<FormulizeInstance>;
  destroy: () => void;
}

// Internal mapping of variable types to computation store types
function mapVariableType(
  type: "constant" | "input" | "dependent"
): "constant" | "input" | "dependent" | "none" {
  switch (type) {
    case "constant":
      return "constant";
    case "input":
      return "input";
    case "dependent":
      return "dependent";
    default:
      return "none";
  }
}

async function create(
  config: FormulizeConfig,
  container?: string
): Promise<FormulizeInstance> {
  try {
    const { formula } = config;

    // Validate the formula
    if (!formula) {
      throw new Error("No formula defined in configuration");
    }

    if (!formula.expressions || formula.expressions.length === 0) {
      throw new Error("No expressions defined in formula");
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

    // Parse and set up the new formula
    const augmentedFormula = deriveAugmentedFormula(formula.expressions[0]);
    const canonicalFormula = canonicalizeFormula(augmentedFormula);

    // Set the formula in the store
    formulaStore.updateFormula(canonicalFormula);

    // Add variables to computation store from the configuration
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

    // Set up the computation engine if specified
    if (formula.computation) {
      computationStore.computationEngine = formula.computation.engine;
      computationStore.computationConfig = formula.computation;
    } else {
      // Default to LLM engine if not specified
      computationStore.computationEngine = "llm";
      computationStore.computationConfig = null;
    }

    // Store the original expressions array for components like BlockInteractivity
    computationStore.originalExpressions = formula.expressions || [];

    await computationStore.setFormula(formulaStore.latexWithoutStyling);

    // Store the formulaId for setVariable method to use
    const instance = {
      formula,
      getVariable: (name: string) => {
        const symbol = name.replace(/\$/g, "");
        const varId = `var-${symbol}`;
        const variable = computationStore.variables.get(varId);
        return {
          name,
          value: variable?.value ?? 0,
          type: formula.variables[name].type,
        };
      },
      setVariable: (name: string, value: number) => {
        const symbol = name.replace(/\$/g, "");
        const varId = `var-${symbol}`;

        // Only allow setting non-dependent variables
        if (formula.variables[name]?.type !== "dependent") {
          // Set in computation store
          computationStore.setValue(varId, value);

          // Update formula reference
          formula.variables[name].value = value;

          return true;
        }

        return false;
      },
      update: async (updatedConfig: FormulizeConfig) => {
        return await create(updatedConfig, container);
      },
      destroy: () => {
        // Reset with an empty formula
        formulaStore.updateFormula(new AugmentedFormula([]));
      },
    };
    return instance;
  } catch (error) {
    console.error("Error creating formula:", error);
    throw error;
  }
}

// Export the Formulize API
const Formulize = {
  create,
};

export default Formulize;

// // Type aliases for backward compatibility
// export type FormulizeFormula = IFormula;
// export type FormulizeComputation = IComputation;
