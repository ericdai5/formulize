/**
 * Manual Computation Engine for Formulize
 *
 * This module provides manual computation capability allowing authors to define
 * custom JavaScript functions for computing computed variables.
 *
 * @module engine/manual
 */
import { IFormula } from "../../types/formula";
import { IValue, IVariable } from "../../types/variable";

// ============================================================================
// Helpers
// ============================================================================

function getComputedVariableNames(
  variables: Record<string, IVariable>
): string[] {
  return Object.entries(variables)
    .filter(([, varDef]) => varDef.role === "computed")
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
  // If manual function returns a value, also sync it to computed variables
  if (isValidNumericResult(returnValue)) {
    for (const variable of Object.values(variables)) {
      if (variable.role === "computed") {
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
 * Computes the formula with the given variable values using custom JavaScript functions.
 * Variables should already be normalized (typically from the computation store).
 */
export function computeWithManualEngine(
  formulas: IFormula[],
  variables: Record<string, IVariable>
): Record<string, IValue> {
  try {
    if (!variables || Object.keys(variables).length === 0) {
      console.warn("⚠️ No variables provided");
      return {};
    }

    if (!formulas || formulas.length === 0) {
      console.warn("⚠️ No formulas provided");
      return {};
    }

    // Extract computed variables
    const computedVars = getComputedVariableNames(variables);
    if (computedVars.length === 0) {
      console.warn("⚠️ No computed variables found");
      return {};
    }

    // Get formulas with manual functions
    const manualFormulas = getManualFormulas(formulas);
    if (manualFormulas.length === 0) {
      console.warn("⚠️ No formulas with manual functions found");
      return {};
    }

    // Execute all manual formulas
    executeManualFormulas(manualFormulas, variables);
    // Collect and return results
    return collectResults(variables);
  } catch (error) {
    console.error("Error computing with manual engine:", error);
    return {};
  }
}
