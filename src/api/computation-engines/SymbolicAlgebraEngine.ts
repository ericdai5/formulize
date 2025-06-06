/**
 * Symbolic Algebra Engine for Formulize
 *
 * This module provides symbolic algebra capability for the Formulize API
 * using math.js for formula parsing, variable substitution, and evaluation.
 */
import * as math from "mathjs";

import { IComputation } from "../../types/computation";
import { IFormula } from "../../types/formula";

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
 * @param formula The main formula definition from the Formulize config
 * @param computation The computation configuration with symbolic algebra settings
 * @param dependentVars Names of the dependent variables to solve for
 * @returns A JavaScript function that evaluates the formula
 */
export function deriveSymbolicFunction(
  formula: IFormula,
  computation: IComputation,
  dependentVars: string[]
): (variables: Record<string, number>) => Record<string, number> {
  // All computations now use expressions array
  const expressions = computation.expressions;

  // Process all expressions for math.js
  const processedExpressions = expressions.map((expr: string) =>
    processFormulaString(expr)
  );

  // Try to parse all expressions with math.js
  try {
    // Create a function that evaluates the expressions for all dependent variables
    return function (
      variables: Record<string, number>
    ): Record<string, number> {
      try {
        const result: Record<string, number> = {};

        // For each dependent variable, try to solve the corresponding equation
        for (const dependentVar of dependentVars) {
          // If there's an explicit mapping function for this variable, use it
          if (
            computation.mappings &&
            typeof computation.mappings[dependentVar] === "function"
          ) {
            result[dependentVar] = computation.mappings[dependentVar](
              variables
            ) as number;
            continue;
          }

          // Find the expression that defines this dependent variable
          let foundExpression = false;

          for (const processedExpr of processedExpressions) {
            // Check if this expression defines the current dependent variable
            const equationMatch = processedExpr.match(
              new RegExp(`${dependentVar}\\s*=\\s*(.+)`)
            );

            if (equationMatch) {
              // Extract the right side of the equation and evaluate it
              const rightSide = equationMatch[1];
              const scope = { ...variables };
              result[dependentVar] = math.evaluate(rightSide, scope) as number;
              foundExpression = true;
              break;
            }
          }

          if (!foundExpression) {
            // If no explicit equation found, try to evaluate each expression
            // and see if it yields a result for this variable
            const scope = { ...variables };
            let solved = false;

            for (const processedExpr of processedExpressions) {
              try {
                // Try direct evaluation
                const evalResult = math.evaluate(processedExpr, scope);
                if (typeof evalResult === "number" && !isNaN(evalResult)) {
                  result[dependentVar] = evalResult;
                  solved = true;
                  break;
                }
              } catch {
                // Continue to next expression
                continue;
              }
            }

            if (!solved) {
              console.error(
                `Could not solve for ${dependentVar} from any expression`
              );
              result[dependentVar] = NaN;
            }
          }
        }

        return result;
      } catch (error) {
        console.error("Error evaluating symbolic expressions:", error);
        // Return NaN for all dependent variables on error
        return Object.fromEntries(dependentVars.map((v) => [v, NaN]));
      }
    };
  } catch (error) {
    console.error("Failed to parse symbolic expressions:", error);
    throw new Error(`Failed to parse symbolic expressions: ${error}`);
  }
}

/**
 * Computes the formula with the given variable values
 *
 * @param formula The Formulize formula specification
 * @param computation The computation settings
 * @param variables Current variable values
 * @returns An object with updated dependent variable values
 */
export function computeWithSymbolicEngine(
  formula: IFormula,
  computation: IComputation,
  variables: Record<string, number>
): Record<string, number> {
  try {
    // Get all dependent variables
    const dependentVars = Object.entries(formula.variables)
      .filter(([, varDef]) => varDef.type === "dependent")
      .map(([varName]) => varName);

    // No dependent variables, nothing to compute
    if (dependentVars.length === 0) {
      return {};
    }

    // Derive the evaluation function
    const evaluationFunction = deriveSymbolicFunction(
      formula,
      computation,
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
