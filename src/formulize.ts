/**
 * Formulize API
 *
 * This provides a declarative API for creating interactive formula visualizations
 * as described in the Formulize API Documentation.
 */
import { computationStore } from "./store/computation";
import { FormulaStore, formulaStoreManager } from "./store/formulas";
import { IEnvironment } from "./types/environment";
import { IVariable } from "./types/variable";
import { getVariable } from "./util/computation-helpers";

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
  getFormulaStore: (index: number) => FormulaStore | null; // Get by array index
  getFormulaStoreById: (formulaId: string) => FormulaStore | null; // Get by formulaId
  getFormulaByIndex: (index: number) => string | null; // Get by array index
  getFormulaById: (formulaId: string) => string | null; // Get by formulaId
  getAllFormulaStores: () => FormulaStore[];
  getAllFormulas: () => string[];
  getFormulaStoreCount: () => number;
  resetFormulaState: () => void;
  getFormulaExpression: (formulaId: string) => string | null;
}

// Set up computation engine configuration
function setupComputationEngine(environment: IEnvironment) {
  // Auto-detect engine if not specified
  let engine: "llm" | "symbolic-algebra" | "manual" = "llm"; // default

  if (environment.computation?.engine) {
    engine = environment.computation.engine;
  } else {
    // Auto-detect: if any formula has a manual function, use manual engine
    const hasManualFunctions = environment.formulas?.some(
      (f) => f.manual && typeof f.manual === "function"
    );
    if (hasManualFunctions) {
      engine = "manual";
    }
  }

  computationStore.setComputationEngine(engine);
  computationStore.setComputationConfig(environment.computation || { engine });
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
      controls: config.controls,
      fontSize: config.fontSize,
      labelFontSize: config.labelFontSize,
      labelNodeStyle: config.labelNodeStyle,
      formulaNodeStyle: config.formulaNodeStyle,
    };

    // Reset all state to ensure we start fresh
    // Clear computation store variables and state
    computationStore.reset();
    computationStore.setLastGeneratedCode(null);
    computationStore.setVariableTypesChanged(0);

    // Set initialization flag to prevent premature evaluations
    computationStore.setInitializing(true);

    // Clear all individual formula stores
    formulaStoreManager.clearAllStores();

    // Setup variables
    if (environment.variables) {
      Object.entries(environment.variables).forEach(([varId, variable]) => {
        computationStore.addVariable(varId, variable);
        computationStore.setVariableType(varId, variable.type);
        if (variable.value !== undefined) {
          if (variable.dataType === "set" && Array.isArray(variable.value)) {
            computationStore.setSetValue(varId, variable.value);
          } else if (typeof variable.value === "number") {
            computationStore.setValue(varId, variable.value);
          }
        }
      });
      computationStore.resolveMemberOfRelationships();
    }

    // Now create individual formula stores for each formula
    // With variable trees available
    const formulaStores: FormulaStore[] = [];

    environment.formulas.forEach((formula) => {
      const store = formulaStoreManager.createStore(
        formula.formulaId,
        formula.latex
      );
      formulaStores.push(store);
    });

    // Set up the computation engine
    setupComputationEngine(environment);

    // Store the formulas from the environment in the computation store
    computationStore.setEnvironment(environment);

    // Extract computation expressions from individual formulas
    const symbolicFunctions = environment.formulas
      .filter((f) => f.expression && f.formulaId)
      .map((f) => f.expression!);

    // Extract manual functions from individual formulas
    const manualFunctions = environment.formulas
      .filter((f) => f.manual)
      .map((f) => f.manual!);

    const formulaObjects = environment.formulas;

    // Store the display formulas for rendering and the computation expressions for evaluation
    computationStore.setDisplayedFormulas(formulaObjects.map((f) => f.latex));

    // Set up expressions and enable evaluation
    if (symbolicFunctions.length > 0 || manualFunctions.length > 0) {
      await computationStore.setComputation(symbolicFunctions, manualFunctions);
    }

    // Clear initialization flag to enable normal evaluation
    computationStore.setInitializing(false);

    // Trigger initial evaluation now that everything is set up (skip in step mode)
    if (!computationStore.isStepMode()) {
      computationStore.updateAllDependentVars();
    }

    // Store the formulaId for setVariable method to use
    const instance = {
      environment: environment,
      getVariable: (name: string): IVariable => {
        // Find the variable by name
        if (!environment.variables) {
          throw new Error("No variables defined in environment");
        }
        const variable = environment.variables[name];
        if (!variable) {
          throw new Error(`Variable '${name}' not found`);
        }

        const varId = name;
        const computationVariable = getVariable(varId);

        return {
          type: variable.type,
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
        if (environment.variables) {
          const variable = environment.variables[name];
          if (variable && variable.type !== "dependent") {
            computationStore.setValue(name, value);
            return true;
          }
        }
        return false;
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
        const formula = environment.formulas[index];
        if (!formula) return null;
        return formulaStoreManager.getStore(formula.formulaId);
      },
      getFormulaStoreById: (formulaId: string) => {
        return formulaStoreManager.getStore(formulaId);
      },
      getFormulaByIndex: (index: number) => {
        const formula = environment.formulas[index];
        if (!formula) return null;
        const store = formulaStoreManager.getStore(formula.formulaId);
        return store ? store.latexWithoutStyling : null;
      },
      getFormulaById: (formulaId: string) => {
        const store = formulaStoreManager.getStore(formulaId);
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
      // Formula expression access
      getFormulaExpression: (formulaId: string) => {
        if (environment.formulas) {
          const formula = environment.formulas.find(
            (f) => f.formulaId === formulaId
          );
          if (formula) {
            return formula.expression ?? null;
          }
        }
        return null;
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

  getFormulaStoreById: (formulaId: string): FormulaStore | null => {
    return formulaStoreManager.getStore(formulaId);
  },

  getFormulaById: (formulaId: string): string | null => {
    const store = formulaStoreManager.getStore(formulaId);
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
    formulaStoreManager.clearAllStores();
  },

  getFormulaExpression: (
    environment: IEnvironment,
    formulaId: string
  ): string | null => {
    if (environment.formulas) {
      const formula = environment.formulas.find(
        (f) => f.formulaId === formulaId
      );
      if (formula) {
        return formula.expression ?? null;
      }
    }
    return null;
  },
};

export default Formulize;
