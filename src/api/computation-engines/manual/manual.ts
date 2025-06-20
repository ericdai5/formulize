/**
 * Manual Computation Engine for Formulize
 *
 * This module provides manual computation capability allowing authors to define
 * custom JavaScript functions for computing dependent variables.
 */
import { IEnvironment } from "../../../types/environment";

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

    // Prepare a numeric variable map from environment variables
    const numericVars: Record<string, number> = {};
    for (const [name, varDef] of Object.entries(environment.variables)) {
      if (typeof varDef.value === "number" && isFinite(varDef.value)) {
        numericVars[name] = varDef.value;
      }
    }

    // Execute manual functions for each dependent variable
    for (const dependentVar of dependentVars) {
      let computed = false;

      // Try to find a formula that can compute this dependent variable
      for (const formula of formulasWithManualFunctions) {
        try {
          // Execute the manual function using the numeric variables map
          const computedValue = formula.manual!(numericVars);

          // Validate the result
          if (typeof computedValue === "number" && isFinite(computedValue)) {
            result[dependentVar] = computedValue;
            computed = true;
            break; // Use the first formula that successfully computes this variable
          }
        } catch (error) {
          console.error(
            `Error executing manual function for formula "${formula.name}":`,
            error
          );
        }
      }

      if (!computed) {
        console.warn(
          `⚠️ No valid manual function found for dependent variable: ${dependentVar}`
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
