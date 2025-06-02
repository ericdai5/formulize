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
import { IComputation } from "../types/computation";
import { IFormula } from "../types/formula";
import { IPlot2D } from "../types/plot2d";
import { IVariable } from "../types/variable";

/**
 * Creates an interactive formula visualization from a Formulize specification
 *
 * @param config The Formulize configuration object
 * @param container Optional container element ID to render into
 * @returns A Formulize instance with methods to interact with the rendered formula
 */
// Import binding system
import { bindingSystem } from "./BindingSystem";

// Visualization type definitions
export interface FormulizeVisualization {
  type: "plot2d" | string;
  config: IPlot2D;
  id?: string;
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
  formula: IFormula;
  externalControls?: unknown[];
  visualizations?: FormulizeVisualization[];
  bindings?: FormulizeBinding[];
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

async function create(
  config: FormulizeConfig,
  container?: string
): Promise<FormulizeInstance> {
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

    // Parse and set up the new formula
    const augmentedFormula = deriveAugmentedFormula(formula.expression);
    const canonicalFormula = canonicalizeFormula(augmentedFormula);

    // Set the formula in the store
    formulaStore.updateFormula(canonicalFormula);

    console.log("🔄 Setting up new variables from formula config");

    // Register formula with binding system
    const formulaId = formula.id || "default-formula";

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

    // Set up bindings if they exist
    if (bindings && bindings.length > 0) {
      bindingSystem.registerComponent(
        formulaId,
        "formula",
        formula,
        formula.variables
      );

      // Process local bindings
      Object.entries(formula.variables).forEach(([varName, variable]) => {
        if (variable.bind) {
          bindingSystem.registerLocalBinding(formulaId, varName, variable.bind);
        }
      });

      console.log(`🔗 Setting up ${bindings.length} global bindings`);
      bindingSystem.setGlobalBindings(bindings);
    }

    // Set up visualizations if provided
    if (visualizations && visualizations.length > 0) {
      console.log(`🔍 Setting up ${visualizations.length} visualizations`);
      // Only register visualizations after instance is created
      visualizations.forEach((viz, index) => {
        const vizId = viz.id || `viz-${index}`;
        bindingSystem.registerComponent(
          vizId,
          "visualization",
          viz,
          viz.config
        );
      });
    }

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
