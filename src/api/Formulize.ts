/**
 * Formulize API
 *
 * This provides a declarative API for creating interactive formula visualizations
 * as described in the Formulize API Documentation.
 */
import {
  FormulaStore,
  formulaStoreManager,
} from "../store/FormulaStoreManager";
import { IEnvironment } from "../types/environment";
import { IVariable } from "../types/variable";
import { computationStore } from "./computation";
import { setVariable } from "./propagation";

export interface FormulizeConfig extends IEnvironment {}

/**
 * Interface for the object returned by Formulize.create()
 */
export interface FormulizeInstance {
  environment: IEnvironment;
  getVariable: (name: string) => IVariable;
  setVariable: (name: string, value: number) => boolean;
  update: (config: FormulizeConfig) => Promise<FormulizeInstance>;
  destroy: () => void;
  // Multi-formula management methods
  getFormulaStore: (index: number) => FormulaStore | null;
  getFormulaByIndex: (index: number) => string | null;
  getAllFormulaStores: () => FormulaStore[];
  getAllFormulas: () => string[];
  getFormulaStoreCount: () => number;
  resetFormulaState: () => void;
}

// Set up computation engine configuration
function setupComputationEngine(environment: IEnvironment) {
  computationStore.computationEngine = environment.computation.engine;
  computationStore.computationConfig = environment.computation;
}

// Validate environment configuration
function validateEnvironment(environment: IEnvironment) {
  if (!environment) {
    throw new Error("No configuration provided");
  }

  if (!environment.formulas || environment.formulas.length === 0) {
    throw new Error("No formulas defined in configuration");
  }

  if (!environment.variables) {
    throw new Error("No variables defined in configuration");
  }

  if (!environment.computation) {
    throw new Error("No computation configuration provided");
  }
}

async function create(
  config: FormulizeConfig,
  container?: string
): Promise<FormulizeInstance> {
  try {
    // Validate the config
    validateEnvironment(config);

    const environment: IEnvironment = {
      formulas: config.formulas,
      variables: config.variables,
      computation: config.computation,
      visualizations: config.visualizations,
    };

    // CRITICAL: Reset all state to ensure we start fresh
    // Clear computation store variables and state
    computationStore.variables.clear();
    computationStore.setLastGeneratedCode(null);
    computationStore.variableTypesChanged = 0;

    // Set initialization flag to prevent premature evaluations
    computationStore.setInitializing(true);

    // Clear all individual formula stores
    formulaStoreManager.clearAllStores();

    // Create individual formula stores for each formula
    const formulas = environment.formulas.map((f) => f.function);
    const formulaStores: FormulaStore[] = [];

    formulas.forEach((formulaLatex, index) => {
      const storeId = index.toString();
      const store = formulaStoreManager.createStore(storeId, formulaLatex);
      formulaStores.push(store);
    });

    // Add variables to computation store from the configuration
    Object.entries(environment.variables).forEach(([varName, variable]) => {
      const symbol = varName.replace(/\$/g, "");
      const varId = `var-${symbol}`;
      computationStore.addVariable(varId, symbol);
      computationStore.setVariableType(varId, variable.type);
      if (variable.value !== undefined) {
        computationStore.setValue(varId, variable.value);
      }
    });

    // Set up the computation engine
    setupComputationEngine(environment);

    // Use computation expressions for actual computation
    const computationFunctions = environment.computation.expressions || [];

    // Store the display formulas for rendering and the computation expressions for evaluation
    computationStore.displayedFormulas = formulas;
    computationStore.computationFunctions = computationFunctions;

    // Set up expressions and enable evaluation
    await computationStore.setAllExpressions(computationFunctions);

    // Clear initialization flag to enable normal evaluation
    computationStore.setInitializing(false);

    // Trigger initial evaluation now that everything is set up
    computationStore.updateAllDependentVariables();

    console.log(`✅ Created ${formulaStores.length} individual formula stores`);

    // Store the formulaId for setVariable method to use
    const instance = {
      environment: environment,
      getVariable: (name: string): IVariable => {
        // Find the variable by name
        const variable = environment.variables[name];
        if (!variable) {
          throw new Error(`Variable '${name}' not found`);
        }

        const symbol = name.replace(/\$/g, "");
        const varId = `var-${symbol}`;
        const computationVariable = computationStore.variables.get(varId);

        return {
          type: variable.type,
          value: computationVariable?.value ?? variable.value ?? 0,
          dataType: variable.dataType,
          dimensions: variable.dimensions,
          units: variable.units,
          label: variable.label,
          precision: variable.precision,
          description: variable.description,
          range: variable.range,
          step: variable.step,
          options: variable.options,
        };
      },
      setVariable: (name: string, value: number) => {
        return setVariable(environment, name, value);
      },
      update: async (updatedConfig: FormulizeConfig) => {
        return await create(updatedConfig, container);
      },
      destroy: () => {
        // Clear all individual formula stores
        formulaStoreManager.clearAllStores();
      },
      // Multi-formula management methods
      getFormulaStore: (index: number) => {
        const storeId = index.toString();
        return formulaStoreManager.getStore(storeId);
      },
      getFormulaByIndex: (index: number) => {
        const storeId = index.toString();
        const store = formulaStoreManager.getStore(storeId);
        return store ? store.latexWithoutStyling : null;
      },
      getAllFormulaStores: () => {
        return formulaStoreManager.allStores;
      },
      getAllFormulas: () => {
        return computationStore.displayedFormulas || [];
      },
      getFormulaStoreCount: () => {
        return formulaStoreManager.getStoreCount();
      },
      resetFormulaState: () => {
        // Clear all individual stores
        formulaStoreManager.clearAllStores();
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
  // Utility functions for multi-formula management
  createFormula: async (environment: IEnvironment): Promise<boolean> => {
    try {
      formulaStoreManager.clearAllStores();
      const formulas = environment.formulas.map((f) => f.function);
      const formulaStores: FormulaStore[] = [];

      formulas.forEach((formulaLatex, index) => {
        const storeId = index.toString();
        const store = formulaStoreManager.createStore(storeId, formulaLatex);
        formulaStores.push(store);
      });

      // Add variables to computation store
      Object.entries(environment.variables).forEach(([name, variable]) => {
        const symbol = name.replace(/\$/g, "");
        const id = `var-${symbol}`;
        computationStore.addVariable(id, symbol);
        computationStore.setVariableType(id, variable.type);
        if (variable.value !== undefined) {
          computationStore.setValue(id, variable.value);
        }
      });

      // Set up computation engine
      computationStore.computationEngine = environment.computation.engine;
      computationStore.computationConfig = environment.computation;

      // Use computation expressions for actual computation
      const computationFunctions = environment.computation.expressions || [];

      // Store the display formulas for rendering and the computation expressions for evaluation
      computationStore.displayedFormulas = formulas;
      computationStore.computationFunctions = computationFunctions;

      await computationStore.setAllExpressions(computationFunctions);

      console.log(
        `✅ Created ${formulaStores.length} individual formula stores`
      );
      return true;
    } catch (error) {
      console.error("Error creating formula:", error);
      return false;
    }
  },

  // Utility functions for accessing formulas
  getFormulaStore: (index: number): FormulaStore | null => {
    const storeId = index.toString();
    return formulaStoreManager.getStore(storeId);
  },

  getFormulaByIndex: (index: number): string | null => {
    const storeId = index.toString();
    const store = formulaStoreManager.getStore(storeId);
    return store ? store.latexWithoutStyling : null;
  },

  getAllFormulaStores: (): FormulaStore[] => {
    return formulaStoreManager.allStores;
  },

  getAllFormulas: (): string[] => {
    return computationStore.displayedFormulas || [];
  },

  getFormulaStoreCount: (): number => {
    return formulaStoreManager.getStoreCount();
  },

  resetFormulaState: () => {
    // Clear all individual stores
    formulaStoreManager.clearAllStores();
  },
};

export default Formulize;
