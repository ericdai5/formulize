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
import { IVariable } from "../../types/variable";

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
    .filter(([, varDef]) => varDef.type === "dependent")
    .map(([varName]) => varName);
}

function getManualFormulas(formulas: IFormula[]): IFormula[] {
  return formulas.filter(
    (formula) => formula.manual && typeof formula.manual === "function"
  );
}

function createValueAccessor(
  variables: Record<string, IVariable>
): Record<string, unknown> {
  const vars: Record<string, unknown> = {};

  for (const [key, variable] of Object.entries(variables)) {
    if (variable && typeof variable === "object") {
      // For set variables, return the set array directly
      // For regular variables, return the value
      if (variable.dataType === "set" && "set" in variable) {
        vars[key] = variable.set;
      } else if ("value" in variable) {
        vars[key] = variable.value;
      }
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

function updateDependentVariable(
  formula: IFormula,
  returnValue: number,
  dependentVars: string[],
  variables: Record<string, IVariable>
): void {
  for (const dependentVar of dependentVars) {
    if (
      formula.expression?.includes(`{${dependentVar}}`) ||
      formula.latex?.includes(dependentVar)
    ) {
      variables[dependentVar].value = returnValue;
      break;
    }
  }
}

function executeManualFormula(
  formula: IFormula,
  variables: Record<string, IVariable>,
  dependentVars: string[]
): void {
  // Create value accessor with all variable values
  const vars = createValueAccessor(variables);

  // Execute the manual function
  const returnValue = formula.manual!(vars);

  if (isValidNumericResult(returnValue)) {
    updateDependentVariable(formula, returnValue, dependentVars, variables);
  }

  // Sync back any modified set variables
  for (const [key, value] of Object.entries(vars)) {
    const variable = variables[key];
    if (variable && variable.dataType === "set" && Array.isArray(value)) {
      variable.set = value;
    }
  }
}

function executeManualFormulas(
  formulas: IFormula[],
  variables: Record<string, IVariable>,
  dependentVars: string[]
): void {
  for (const formula of formulas) {
    try {
      executeManualFormula(formula, variables, dependentVars);
    } catch (error) {
      console.error(
        `Error executing manual function for formula "${formula.formulaId}":`,
        error
      );
    }
  }
}

// ============================================================================
// Result Collection
// ============================================================================

function collectResults(
  dependentVars: string[],
  variables: Record<string, IVariable>
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const dependentVar of dependentVars) {
    const varDef = variables[dependentVar];

    // Skip set variables - they use set arrays which are synced separately
    if (varDef.dataType === "set") {
      continue;
    }

    if (isValidNumericResult(varDef.value)) {
      result[dependentVar] = varDef.value;
    } else {
      console.warn(
        `⚠️ No valid value found for dependent variable: ${dependentVar}`,
        varDef
      );
      result[dependentVar] = NaN;
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
 * @returns An object mapping dependent variable names to their computed values
 *
 * @example
 * ```ts
 * const result = computeWithManualEngine(environment);
 * console.log(result.K); // Computed kinetic energy value
 * ```
 */
export function computeWithManualEngine(
  environment: IEnvironment
): Record<string, number> {
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
    executeManualFormulas(manualFormulas, environment.variables, dependentVars);
    // Collect and return results
    return collectResults(dependentVars, environment.variables);
  } catch (error) {
    console.error("Error computing with manual engine:", error);
    return {};
  }
}
