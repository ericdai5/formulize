/**
 * Formulize API
 *
 * This provides a declarative API for creating interactive formula visualizations
 * as described in the Formulize API Documentation.
 */
import { computationStore } from "./store/computation";
import { FormulaStore, formulaStoreManager } from "./store/formulas";
import { IManual } from "./types/computation";
import { IEnvironment } from "./types/environment";
import { IVariable } from "./types/variable";
import { getVariable } from "./util/computation-helpers";
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
function setupComputationEngine(environment: IEnvironment) {
  // Auto-detect engine if not specified
  let engine: "llm" | "symbolic-algebra" | "manual" = "llm"; // default
  if (environment.semantics?.engine) {
    engine = environment.semantics.engine;
  } else {
    // Auto-detect: if computation.manual exists, use manual engine
    const hasComputationManual =
      environment.semantics?.manual &&
      typeof environment.semantics.manual === "function";
    if (hasComputationManual) {
      engine = "manual";
    }
  }
  computationStore.setEngine(engine);
  computationStore.setSemantics(environment.semantics || { engine });
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

async function create(
  config: FormulizeConfig,
  container?: string
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
    computationStore.setLastGeneratedCode(null);
    computationStore.setVariableRolesChanged(0);

    // Set initialization flag to prevent premature evaluations
    computationStore.setInitializing(true);

    // Clear all individual formula stores
    formulaStoreManager.clearAllStores();

    // Setup variables (if provided)
    if (Object.keys(normalizedVariables).length > 0) {
      Object.entries(normalizedVariables).forEach(([varId, variable]) => {
        computationStore.addVariable(varId, variable);
        computationStore.setVariableRole(varId, variable.role);
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
      const store = formulaStoreManager.createStore(formula.id, formula.latex);
      formulaStores.push(store);
    });

    // Set up the computation engine
    setupComputationEngine(environment);

    // Store the formulas from the environment in the computation store
    computationStore.setEnvironment(environment);

    // Extract computation expressions from computation.expressions
    const symbolicFunctions: string[] = environment.semantics?.expressions
      ? Object.values(environment.semantics.expressions)
      : [];

    // Extract manual function from computation.manual
    const manualFunctions: IManual[] =
      environment.semantics?.manual &&
      typeof environment.semantics.manual === "function"
        ? [environment.semantics.manual]
        : [];

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
      computationStore.updateAllComputedVars();
    }

    // Store the id for setVariable method to use
    const instance = {
      environment: environment,
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
        const computationVariable = getVariable(varId);

        return {
          role: variable.role,
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
        if (variable && variable.role !== "computed") {
          computationStore.setValue(name, value);
          return true;
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
    id: string
  ): string | null => {
    return environment.semantics?.expressions?.[id] ?? null;
  },
};

export default Formulize;
