/**
 * Formulize API
 *
 * This provides a declarative API for creating interactive formula visualizations
 * as described in the Formulize API Documentation.
 */
import { ComputationStore, createComputationStore } from "./store/computation";
import { ExecutionStore, createExecutionStore } from "./store/execution";
import { FormulaStore, formulaStoreManager } from "./store/formulas";
import { IManual } from "./types/computation";
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
  getFormulaStore: (index: number) => FormulaStore | null; // Get by array index
  getFormulaStoreById: (id: string) => FormulaStore | null; // Get by id
  getFormulaByIndex: (index: number) => string | null; // Get by array index
  getFormulaById: (id: string) => string | null; // Get by id
  getAllFormulaStores: () => FormulaStore[];
  getAllFormulas: () => string[];
  getFormulaStoreCount: () => number;
  resetFormulaState: () => void;
  getFormulaExpression: (id: string) => string | null;
}

// Set up computation engine configuration
function setupComputationEngine(
  environment: IEnvironment,
  computationStore: ComputationStore
) {
  // Infer engine from semantics: expressions → symbolic-algebra, manual → manual
  const hasExpressions =
    environment.semantics?.expressions &&
    Object.keys(environment.semantics.expressions).length > 0;
  const hasManual = !!environment.semantics?.manual;
  let engine: "symbolic-algebra" | "manual" = "manual"; // default
  if (hasExpressions) {
    engine = "symbolic-algebra";
  } else if (hasManual) {
    engine = "manual";
  }
  computationStore.setEngine(engine);
  computationStore.setSemantics(environment.semantics || {});
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
      fontSize: config.fontSize,
      labelFontSize: config.labelFontSize,
      labelNodeStyle: config.labelNodeStyle,
      formulaNodeStyle: config.formulaNodeStyle,
    };

    // Reset all state to ensure we start fresh
    // Clear computation store variables and state
    computationStore.reset();
    computationStore.setVariableRolesChanged(0);

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

    // Extract computation expressions from computation.expressions
    const symbolicFunctions: string[] = environment.semantics?.expressions
      ? Object.values(environment.semantics.expressions)
      : [];

    // Extract manual function from semantics.manual
    const manual: IManual | null = environment.semantics?.manual ?? null;

    // Store formulas in computation store for rendering
    computationStore.setFormulas(environment.formulas);

    // Set up expressions and enable evaluation
    if (symbolicFunctions.length > 0 || manual) {
      await computationStore.setComputation(symbolicFunctions, manual);
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
        // Clear all individual formula stores
        formulaStoreManager.clearAllStores();
      },
      // Multi-formula management methods
      getFormulaStore: (index: number) => {
        const formula = environment.formulas[index];
        if (!formula) return null;
        return formulaStoreManager.getStore(formula.id);
      },
      getFormulaStoreById: (id: string) => {
        return formulaStoreManager.getStore(id);
      },
      getFormulaByIndex: (index: number) => {
        const formula = environment.formulas[index];
        if (!formula) return null;
        const store = formulaStoreManager.getStore(formula.id);
        return store ? store.latexWithoutStyling : null;
      },
      getFormulaById: (id: string) => {
        const store = formulaStoreManager.getStore(id);
        return store ? store.latexWithoutStyling : null;
      },
      getAllFormulaStores: () => {
        return formulaStoreManager.allStores;
      },
      getAllFormulas: () => {
        return computationStore.formulas.map((f) => f.latex);
      },
      getFormulaStoreCount: () => {
        return formulaStoreManager.getStoreCount();
      },
      resetFormulaState: () => {
        // Clear all individual stores
        formulaStoreManager.clearAllStores();
      },
      // Formula expression access
      getFormulaExpression: (id: string) => {
        return environment.semantics?.expressions?.[id] ?? null;
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

  getFormulaStoreById: (id: string): FormulaStore | null => {
    return formulaStoreManager.getStore(id);
  },

  getFormulaById: (id: string): string | null => {
    const store = formulaStoreManager.getStore(id);
    return store ? store.latexWithoutStyling : null;
  },

  getAllFormulaStores: (): FormulaStore[] => {
    return formulaStoreManager.allStores;
  },

  getFormulaStoreCount: (): number => {
    return formulaStoreManager.getStoreCount();
  },

  resetFormulaState: () => {
    formulaStoreManager.clearAllStores();
  },

  getFormulaExpression: (
    environment: IEnvironment,
    id: string
  ): string | null => {
    return environment.semantics?.expressions?.[id] ?? null;
  },
};

export default Formulize;
