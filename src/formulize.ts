/**
 * Formulize API
 *
 * This provides a declarative API for creating interactive formula visualizations
 * as described in the Formulize API Documentation.
 */
import { ComputationStore, createComputationStore } from "./store/computation";
import { ExecutionStore, createExecutionStore } from "./store/execution";
import { FormulaStore, formulaStoreManager } from "./store/formulas";
import { IEnvironment } from "./types/environment";
import { IVariable } from "./types/variable";
import { normalizeVariables } from "./util/normalize-variables";

/**
 * User-facing configuration type.
 */
export type FormulizeConfig = IEnvironment;

/**
 * Interface for the object returned by Formulize.create()
 */
export interface FormulizeInstance {
  environment: IEnvironment;
  computationStore: ComputationStore;
  executionStore: ExecutionStore;
  getVariable: (name: string) => IVariable;
  setVariable: (name: string, value: number) => boolean;
  update: (config: FormulizeConfig) => Promise<FormulizeInstance>;
  destroy: () => void;
}

// Set up computation engine configuration
function setupComputationEngine(
  environment: IEnvironment,
  computationStore: ComputationStore
) {
  computationStore.setSemantics(environment.semantics ?? null);
}

// Validate environment configuration
function validateEnvironment(config: FormulizeConfig) {
  if (!config) {
    throw new Error("No configuration provided");
  }
  if (!config.formulas || config.formulas.length === 0) {
    throw new Error("No formulas defined in configuration");
  }
}

/**
 * Internal function that initializes a Formulize instance with the given stores.
 * Used by both `create` (with new stores) and `update` (with existing stores).
 */
async function initializeInstance(
  config: FormulizeConfig,
  computationStore: ComputationStore,
  executionStore: ExecutionStore
): Promise<FormulizeInstance> {
  try {
    // Validate the config
    validateEnvironment(config);

    // Normalize variables from simplified format to full IVariable objects
    const normalizedVariables = normalizeVariables(config.variables);

    const environment: IEnvironment = {
      formulas: config.formulas,
      variables: normalizedVariables,
      semantics: config.semantics,
      visualizations: config.visualizations,
      controls: config.controls,
      stepping: config.stepping,
      fontSize: config.fontSize,
      labelFontSize: config.labelFontSize,
      labelNodeStyle: config.labelNodeStyle,
      formulaNodeStyle: config.formulaNodeStyle,
    };

    // Reset all state to ensure we start fresh
    // Clear computation store variables and state
    computationStore.reset();
    computationStore.setVariableRolesChanged(0);

    // Set stepping mode from config
    computationStore.setStepping(config.stepping === true);

    // Clear all individual formula stores
    formulaStoreManager.clearAllStores();

    // Setup variables (if provided)
    if (Object.keys(normalizedVariables).length > 0) {
      Object.entries(normalizedVariables).forEach(([varId, variable]) => {
        computationStore.addVariable(varId, variable);
        if (variable.value !== undefined) {
          if (variable.dataType === "set" && Array.isArray(variable.value)) {
            computationStore.setSetValue(varId, variable.value);
          } else if (typeof variable.value === "number") {
            computationStore.setValue(varId, variable.value);
          }
        }
      });
    }

    // Now create individual formula stores for each formula
    // With variable trees available
    const formulaStores: FormulaStore[] = [];
    environment.formulas.forEach((formula) => {
      const store = formulaStoreManager.createStore(
        formula.id,
        formula.latex,
        computationStore
      );
      formulaStores.push(store);
    });

    // Set up the computation engine
    setupComputationEngine(environment, computationStore);

    // Store the formulas from the environment in the computation store
    computationStore.setEnvironment(environment);

    // Store formulas in computation store for rendering
    computationStore.setFormulas(environment.formulas);

    // Set up semantics function and enable evaluation
    if (environment.semantics) {
      await computationStore.setComputation();
    }

    // Trigger initial computation (skip in step mode)
    if (!computationStore.isStepMode()) {
      computationStore.runComputation();
    }

    // Store the id for setVariable method to use
    const instance: FormulizeInstance = {
      environment: environment,
      computationStore,
      executionStore,
      getVariable: (name: string): IVariable => {
        // Find the variable by name
        if (Object.keys(normalizedVariables).length === 0) {
          throw new Error("No variables defined in environment");
        }
        const variable = normalizedVariables[name];
        if (!variable) {
          throw new Error(`Variable '${name}' not found`);
        }
        const varId = name;
        const computationVariable = computationStore.variables.get(varId);
        return {
          input: variable.input,
          value: computationVariable?.value ?? variable.value ?? 0,
          dataType: variable.dataType,
          dimensions: variable.dimensions,
          units: variable.units,
          name: variable.name,
          precision: variable.precision,
          description: variable.description,
          range: variable.range,
          step: variable.step,
          options: variable.options,
          key: variable.key,
        };
      },
      setVariable: (name: string, value: number) => {
        const variable = normalizedVariables[name];
        // Allow setting value for any variable (manual function determines what's computed)
        if (variable) {
          computationStore.setValue(name, value);
          return true;
        }
        return false;
      },
      update: async (updatedConfig: FormulizeConfig) => {
        return await initializeInstance(
          updatedConfig,
          computationStore,
          executionStore
        );
      },
      destroy: () => {
        formulaStoreManager.clearAllStores();
      },
    };
    return instance;
  } catch (error) {
    console.error("Error creating formula:", error);
    throw error;
  }
}

/**
 * Public API - creates a new Formulize instance with its own isolated stores.
 */
async function create(config: FormulizeConfig): Promise<FormulizeInstance> {
  const computationStore = createComputationStore();
  const executionStore = createExecutionStore();
  return initializeInstance(config, computationStore, executionStore);
}

// Export the Formulize API
const Formulize = {
  create,
};

export default Formulize;
