/**
 * Manual Computation Engine for Formulize
 *
 * This module provides manual computation capability allowing authors to define
 * custom JavaScript functions for computing computed variables.
 *
 * @module engine/manual
 */
import { IManual } from "../../types/computation";
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
// Computation-level Manual Function Execution
// ============================================================================

function executeComputationManual(
  manualFn: IManual,
  variables: Record<string, IVariable>
): void {
  // Create value accessor with all variable values
  const vars = createValueAccessor(variables);
  // Execute the manual function
  const returnValue = manualFn(vars);
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

// ============================================================================
// Public API
// ============================================================================

/**
 * Computes the formula with the given variable values using custom JavaScript functions.
 * Variables should already be normalized (typically from the computation store).
 *
 * @param variables - Record of variable definitions with current values
 * @param computationManual - The computation-level manual function
 */
export function computeWithManualEngine(
  variables: Record<string, IVariable>,
  computationManual?: IManual
): Record<string, IValue> {
  try {
    if (!variables || Object.keys(variables).length === 0) {
      console.warn("⚠️ No variables provided");
      return {};
    }

    // Extract computed variables
    const computedVars = getComputedVariableNames(variables);
    if (computedVars.length === 0) {
      console.warn("⚠️ No computed variables found");
      return {};
    }

    if (!computationManual || typeof computationManual !== "function") {
      console.warn("⚠️ No manual function provided in computation config");
      return {};
    }

    executeComputationManual(computationManual, variables);
    return collectResults(variables);
  } catch (error) {
    console.error("Error computing with manual engine:", error);
    return {};
  }
}
