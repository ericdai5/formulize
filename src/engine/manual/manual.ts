/**
 * Manual Computation Engine for Formulize
 *
 * This module provides manual computation capability allowing authors to define
 * custom JavaScript functions for computing dependent variables.
 *
 * @module engine/manual
 */
import { IEnvironment } from "../../types/environment";
import { IFormula } from "../../types/formula";
import { IValue, IVariable } from "../../types/variable";

// ============================================================================
// Validation
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

function validateEnvironment(environment: IEnvironment): ValidationResult {
  if (!environment?.variables) {
    return {
      isValid: false,
      error: "Invalid environment: missing variables",
    };
  }

  if (!environment.formulas?.length) {
    return {
      isValid: false,
      error: "⚠️ No formulas found in environment",
    };
  }

  return { isValid: true };
}

// ============================================================================
// Helpers
// ============================================================================

function getDependentVariableNames(
  variables: Record<string, IVariable>
): string[] {
  return Object.entries(variables)
    .filter(([, varDef]) => varDef.role === "dependent")
    .map(([varName]) => varName);
}

function getManualFormulas(formulas: IFormula[]): IFormula[] {
  return formulas.filter(
    (formula) => formula.manual && typeof formula.manual === "function"
  );
}

function createValueAccessor(
  variables: Record<string, IVariable>
): Record<string, any> {
  const vars: Record<string, any> = {};
  for (const [key, variable] of Object.entries(variables)) {
    if (
      variable &&
      typeof variable === "object" &&
      "value" in variable &&
      variable.value !== undefined
    ) {
      // Value can be either a number or an array (for sets)
      vars[key] = variable.value;
    }
  }
  return vars;
}

function isValidNumericResult(value: unknown): value is number {
  return value !== undefined && typeof value === "number" && isFinite(value);
}

// ============================================================================
// Execution
// ============================================================================

function executeManualFormula(
  formula: IFormula,
  variables: Record<string, IVariable>
): void {
  // Create value accessor with all variable values
  const vars = createValueAccessor(variables);
  // Execute the manual function
  const returnValue = formula.manual!(vars);
  // Sync back all changed values from vars to variables
  for (const [varName, value] of Object.entries(vars)) {
    if (
      variables[varName] &&
      (typeof value === "number" || Array.isArray(value))
    ) {
      variables[varName].value = value;
    }
  }
  // If manual function returns a value, also sync it to dependent variables
  if (isValidNumericResult(returnValue)) {
    for (const variable of Object.values(variables)) {
      if (variable.role === "dependent") {
        variable.value = returnValue;
      }
    }
  }
}

function executeManualFormulas(
  formulas: IFormula[],
  variables: Record<string, IVariable>
): void {
  for (const formula of formulas) {
    try {
      executeManualFormula(formula, variables);
    } catch (error) {
      console.error(
        `Error executing manual function for formula "${formula.id}":`,
        error
      );
    }
  }
}

// ============================================================================
// Result Collection
// ============================================================================

function collectResults(
  variables: Record<string, IVariable>
): Record<string, IValue> {
  const result: Record<string, IValue> = {};
  for (const [varName, variable] of Object.entries(variables)) {
    if (variable.value !== undefined) {
      result[varName] = variable.value;
    }
  }
  return result;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Computes the formula with the given variable values using custom JavaScript functions
 *
 * @param environment - The Formulize environment containing formulas and variables
 * @returns An object mapping variable names to their computed values
 *
 * @example
 * ```ts
 * const result = computeWithManualEngine(environment);
 * console.log(result.K); // Computed kinetic energy value
 * ```
 */
export function computeWithManualEngine(
  environment: IEnvironment
): Record<string, IValue> {
  try {
    // Validate environment
    const validation = validateEnvironment(environment);
    if (!validation.isValid) {
      console.warn(validation.error);
      return {};
    }

    // Extract dependent variables
    const dependentVars = getDependentVariableNames(environment.variables);
    if (dependentVars.length === 0) {
      console.warn("⚠️ No dependent variables found");
      return {};
    }

    // Get formulas with manual functions
    const manualFormulas = getManualFormulas(environment.formulas);
    if (manualFormulas.length === 0) {
      console.warn("⚠️ No formulas with manual functions found");
      return {};
    }

    // Execute all manual formulas
    executeManualFormulas(manualFormulas, environment.variables);
    // Collect and return results
    return collectResults(environment.variables);
  } catch (error) {
    console.error("Error computing with manual engine:", error);
    return {};
  }
}
