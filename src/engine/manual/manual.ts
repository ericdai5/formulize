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

/**
 * Creates a Proxy that allows direct mutation of variable values.
 * Reading `vars.K` returns `variables.K.value`
 * Writing `vars.K = 10` directly sets `variables.K.value = 10`
 */
function createValueProxy(
  variables: Record<string, IVariable>
): Record<string, any> {
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        return variables[prop]?.value;
      },
      set(_target, prop: string, value) {
        if (variables[prop]) {
          variables[prop].value = value;
        }
        return true;
      },
      // Support Object.keys(), Object.entries(), etc.
      ownKeys() {
        return Object.keys(variables);
      },
      getOwnPropertyDescriptor(_target, prop: string) {
        if (prop in variables) {
          return {
            enumerable: true,
            configurable: true,
            value: variables[prop]?.value,
          };
        }
        return undefined;
      },
    }
  );
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
  // Create proxy that directly mutates variable values
  const vars = createValueProxy(variables);
  // Execute the manual function - mutations go directly to variables
  manualFn(vars);
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
