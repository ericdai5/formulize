/**
 * Symbolic Algebra Engine for Formulize
 *
 * This module provides symbolic algebra capability for the Formulize API
 * using math.js for formula parsing, variable substitution, and evaluation.
 */
import * as math from "mathjs";

import { IComputation } from "../../types/computation";
import { IEnvironment } from "../../types/environment";

/**
 * Processes a formula string to replace variable names with math.js symbols
 * Variable names in the formula should be wrapped in curly braces: {variableName}
 * @param formulaStr The formula string with variables in curly braces
 * @returns A processed formula ready for math.js parsing
 */
function processFormulaString(formulaStr: string): string {
  // Replace {variableName} with variableName
  return formulaStr.replace(/\{([^}]+)\}/g, "$1");
}

/**
 * Derives a JavaScript function from a symbolic formula that computes
 * dependent variables based on input variables
 *
 * @param expressions The expressions extracted from formula objects
 * @param dependentVars Names of the dependent variables to solve for
 * @returns A JavaScript function that evaluates the formula
 */
export function deriveSymbolicFunction(
  expressions: string[],
  dependentVars: string[]
): (variables: Record<string, number>) => Record<string, number> {
  const processedExpressions = expressions.map((expr: string) =>
    processFormulaString(expr)
  );

  return function (variables: Record<string, number>): Record<string, number> {
    const result: Record<string, number> = {};
    const scope = { ...variables };
    const unresolved = new Set(dependentVars);

    // Keep propagating changes until all variables are resolved or no progress
    while (unresolved.size > 0) {
      const initialUnresolvedCount = unresolved.size;

      for (const expr of processedExpressions) {
        for (const depVar of unresolved) {
          // Check pattern: depVar = expression
          const match1 = expr.match(new RegExp(`^\\s*${depVar}\\s*=\\s*(.+)$`));
          if (match1) {
            try {
              result[depVar] = math.evaluate(match1[1], scope) as number;
              scope[depVar] = result[depVar];
              unresolved.delete(depVar);
              break; // Move to next expression since we found a match
            } catch {
              // Can't evaluate yet, dependencies not ready
            }
          }

          // Check pattern: expression = depVar
          const match2 = expr.match(
            new RegExp(`^\\s*(.+?)\\s*=\\s*${depVar}\\s*$`)
          );
          if (match2) {
            try {
              result[depVar] = math.evaluate(match2[1], scope) as number;
              scope[depVar] = result[depVar];
              unresolved.delete(depVar);
              break; // Move to next expression since we found a match
            } catch {
              // Can't evaluate yet, dependencies not ready
            }
          }
        }
      }

      // If no progress was made in this iteration, break to avoid infinite loop
      if (unresolved.size === initialUnresolvedCount) {
        break;
      }
    }

    return result;
  };
}

/**
 * Computes the formula with the given variable values
 *
 * @param environment The Formulize environment
 * @param computation The computation settings
 * @param variables Current variable values
 * @returns An object with updated dependent variable values
 */
export function computeWithSymbolicEngine(
  environment: IEnvironment,
  computation: IComputation,
  variables: Record<string, number>
): Record<string, number> {
  try {
    // Validate environment has proper structure
    if (!environment || !environment.variables) {
      console.warn("⚠️ Invalid environment: missing variables");
      return {};
    }

    // Check if formulas exist and are properly configured
    if (!environment.formulas || !Array.isArray(environment.formulas)) {
      console.warn("⚠️ No formulas array found in environment");
      return {};
    }

    // Get all dependent variables
    const dependentVars = Object.entries(environment.variables)
      .filter(([, varDef]) => varDef.type === "dependent")
      .map(([varName]) => varName);

    // No dependent variables, nothing to compute
    if (dependentVars.length === 0) {
      console.warn("⚠️ No dependent variables found");
      return {};
    }

    // Extract expressions from individual formulas only
    const expressions = environment.formulas
      .map((f) => f?.expression)
      .filter(
        (expression): expression is string =>
          expression !== undefined &&
          expression !== null &&
          typeof expression === "string"
      );

    if (expressions.length === 0) {
      console.warn("⚠️ No valid expressions found in formulas");
      return {};
    }

    // Derive the evaluation function
    const evaluationFunction = deriveSymbolicFunction(
      expressions,
      dependentVars
    );

    // Execute the function with the current variable values
    return evaluationFunction(variables);
  } catch (error) {
    console.error("Error computing with symbolic engine:", error);
    return {};
  }
}

/**
 * Generates symbolic derivatives for a formula
 * Useful for advanced analysis and optimization
 *
 * @param formula The formula expression to differentiate
 * @param variableName The variable to differentiate with respect to
 * @returns The symbolic derivative
 */
export function deriveSymbolicDerivative(
  formulaStr: string,
  variableName: string
): string {
  try {
    const processedFormula = processFormulaString(formulaStr);
    const parsedExpression = math.parse(processedFormula);
    const derivative = math.derivative(parsedExpression, variableName);
    return derivative.toString();
  } catch (error) {
    console.error("Error computing symbolic derivative:", error);
    return "Error: Could not compute derivative";
  }
}

/**
 * Simplifies a symbolic formula
 *
 * @param formulaStr The formula to simplify
 * @returns The simplified formula
 */
export function simplifySymbolicFormula(formulaStr: string): string {
  try {
    const processedFormula = processFormulaString(formulaStr);
    const simplified = math.simplify(processedFormula);
    return simplified.toString();
  } catch (error) {
    console.error("Error simplifying formula:", error);
    return formulaStr;
  }
}
