/**
 * Manual Computation Engine for Formulize
 *
 * This module provides manual computation capability allowing authors to define
 * custom JavaScript functions for computing dependent variables.
 */
import { IEnvironment } from "../../types/environment";

/**
 * Computes the formula with the given variable values using custom JavaScript functions
 *
 * @param environment The Formulize environment
 * @returns An object with updated dependent variable values
 */
export function computeWithManualEngine(
  environment: IEnvironment
): Record<string, number> {
  try {
    // Validate environment has proper structure
    if (!environment || !environment.variables) {
      console.warn("Invalid environment: missing variables");
      return {};
    }

    // Check if formulas exist
    if (!environment.formulas || environment.formulas.length === 0) {
      console.warn("⚠️ No formulas found in environment");
      return {};
    }

    // Get all dependent variables from environment
    const dependentVars = Object.entries(environment.variables)
      .filter(([, varDef]) => varDef.type === "dependent")
      .map(([varName]) => varName);

    // No dependent variables, nothing to compute
    if (dependentVars.length === 0) {
      console.warn("⚠️ No dependent variables found");
      return {};
    }

    const result: Record<string, number> = {};

    // Find formulas with manual functions
    const formulasWithManualFunctions = environment.formulas.filter(
      (formula) => formula.manual && typeof formula.manual === "function"
    );

    if (formulasWithManualFunctions.length === 0) {
      console.warn("⚠️ No formulas with manual functions found");
      return {};
    }

    // Execute all manual functions
    for (const formula of formulasWithManualFunctions) {
      try {
        // Execute the formula and capture the return value
        const returnValue = formula.manual!(environment.variables);

        // If the function returns a value, use it to update the dependent variables
        if (returnValue !== undefined && typeof returnValue === "number" && isFinite(returnValue)) {
          // Find which dependent variable this formula updates
          // Usually the formula updates the first dependent variable in the expression
          for (const dependentVar of dependentVars) {
            // Check if this variable appears in the formula's expression or latex
            if (formula.expression?.includes(`{${dependentVar}}`) ||
                formula.latex?.includes(dependentVar)) {
              environment.variables[dependentVar].value = returnValue;
              break; // Only update the first matching dependent variable
            }
          }
        }
        // If no return value, assume the function updated variables directly (backward compatibility)
      } catch (error) {
        console.error(
          `Error executing manual function for formula "${formula.formulaId}":`,
          error
        );
      }
    }

    // Collect results from the updated variables
    for (const dependentVar of dependentVars) {
      const varDef = environment.variables[dependentVar];

      // Skip set variables - they use set arrays which are synced separately
      if (varDef.dataType === "set") {
        continue;
      }
      if (
        varDef.value !== undefined &&
        typeof varDef.value === "number" &&
        isFinite(varDef.value)
      ) {
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
  } catch (error) {
    console.error("Error computing with manual engine:", error);
    return {};
  }
}
