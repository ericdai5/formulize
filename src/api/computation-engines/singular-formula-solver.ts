/**
 * Singular Formula Solver for Formulize - Simplified Version
 *
 * This module provides fast formula solving optimized for 3D plotting performance.
 * Uses minimal Math.js operations and direct evaluation where possible.
 */
import * as math from "mathjs";

/**
 * Processes a formula string to replace variable names with math.js symbols
 * Variable names in the formula should be wrapped in curly braces: {variableName}
 * @param formulaStr The formula string with variables in curly braces
 * @returns A processed formula ready for math.js parsing
 */
function processFormulaString(formulaStr: string): string {
  return formulaStr.replace(/\{([^}]+)\}/g, "$1");
}

/**
 * Solves a single formula for a specific variable using fast direct evaluation
 *
 * @param formula The formula expression to solve
 * @param variables Object containing known variable values
 * @param solveFor The variable name to solve for
 * @returns The solved value for the target variable, or null if solving fails
 */
export function solveSingularFormula(
  formula: string,
  variables: Record<string, number>,
  solveFor: string
): number | null {
  try {
    const processedFormula = processFormulaString(formula);

    // Handle different equation patterns with fast direct evaluation
    if (processedFormula.includes("=")) {
      return solveEquationDirect(processedFormula, variables, solveFor);
    } else {
      // If no equals sign, assume it's an expression that should equal the solveFor variable
      return evaluateExpressionDirect(processedFormula, variables, solveFor);
    }
  } catch (error) {
    console.debug("Error solving singular formula:", error);
    return null;
  }
}

/**
 * Solves an equation using direct evaluation without complex symbolic computation
 */
function solveEquationDirect(
  equation: string,
  variables: Record<string, number>,
  solveFor: string
): number | null {
  try {
    const [leftSide, rightSide] = equation.split("=").map((s) => s.trim());

    // Case 1: Direct variable assignment (e.g., "z = x + y")
    if (leftSide === solveFor) {
      return evaluateExpressionDirect(rightSide, variables, solveFor);
    }

    if (rightSide === solveFor) {
      return evaluateExpressionDirect(leftSide, variables, solveFor);
    }

    // Case 2: Try simple rearrangement for linear equations
    return trySimpleLinearSolving(leftSide, rightSide, variables, solveFor);
  } catch (error) {
    console.debug("Error in direct equation solving:", error);
    return null;
  }
}

/**
 * Simple linear equation solving for common patterns
 */
function trySimpleLinearSolving(
  leftSide: string,
  rightSide: string,
  variables: Record<string, number>,
  solveFor: string
): number | null {
  try {
    // For simple linear equations, try to isolate the variable
    // This handles cases like "x + y = z" -> solve for any variable

    const leftExpr = math.parse(leftSide);
    const rightExpr = math.parse(rightSide);

    // Create scope without the solve variable
    const scope = { ...variables };
    delete scope[solveFor];

    // Try to evaluate both sides with the variable set to 0, then 1
    // to determine if it's linear and get coefficient
    scope[solveFor] = 0;
    const left0 = leftExpr.compile().evaluate(scope);
    const right0 = rightExpr.compile().evaluate(scope);

    scope[solveFor] = 1;
    const left1 = leftExpr.compile().evaluate(scope);
    const right1 = rightExpr.compile().evaluate(scope);

    // Check if linear (coefficient is constant)
    const leftCoeff = left1 - left0;
    const rightCoeff = right1 - right0;
    const netCoeff = leftCoeff - rightCoeff;

    if (Math.abs(netCoeff) > 1e-10) {
      // Linear equation: solve for the variable
      const result = (right0 - left0) / netCoeff;
      return typeof result === "number" && isFinite(result) ? result : null;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Direct expression evaluation with minimal overhead
 */
function evaluateExpressionDirect(
  expression: string,
  variables: Record<string, number>,
  solveFor: string
): number | null {
  try {
    const scope = { ...variables };
    delete scope[solveFor];

    const result = math.evaluate(expression, scope);
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch (error) {
    console.debug("Error evaluating expression:", error);
    return null;
  }
}

/**
 * Validates that a formula is solvable for a given variable
 */
export function canSolveForVariable(
  formula: string,
  solveFor: string
): boolean {
  try {
    const processedFormula = processFormulaString(formula);
    return processedFormula.includes(solveFor);
  } catch {
    return false;
  }
}
