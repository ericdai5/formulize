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

/**
 * Computes the intersection line of two surfaces automatically
 *
 * @param surface1Formula First surface formula
 * @param surface2Formula Second surface formula
 * @param variables Object containing known variable values
 * @param xAxisVar X-axis variable name
 * @param yAxisVar Y-axis variable name
 * @param zVar Z-axis variable name
 * @param parameterValue Value of the parameter for the intersection line
 * @returns Object with x, y, z coordinates of the intersection point, or null if intersection cannot be computed
 */
export function computeSurfaceIntersection(
  surface1Formula: string,
  surface2Formula: string,
  variables: Record<string, number>,
  xAxisVar: string,
  yAxisVar: string,
  zVar: string,
  parameterValue: number
): { x: number; y: number; z: number } | null {
  try {
    const formula1 = processFormulaString(surface1Formula);
    const formula2 = processFormulaString(surface2Formula);

    // Create a copy of variables for manipulation
    const baseVars = { ...variables };

    // Strategy: Use one coordinate as parameter, solve for the other two
    // Try using z as parameter first (most common case)
    baseVars[zVar] = parameterValue;

    // Solve the system of equations with z fixed
    const result = solveTwoEquationSystem(
      formula1,
      formula2,
      baseVars,
      xAxisVar,
      yAxisVar
    );

    if (result) {
      return {
        x: result.x,
        y: result.y,
        z: parameterValue,
      };
    }

    // If z-parameter didn't work, try x as parameter
    delete baseVars[zVar];
    baseVars[xAxisVar] = parameterValue;

    const resultX = solveTwoEquationSystem(
      formula1,
      formula2,
      baseVars,
      yAxisVar,
      zVar
    );
    if (resultX) {
      return {
        x: parameterValue,
        y: resultX.x, // x from result corresponds to y variable
        z: resultX.y, // y from result corresponds to z variable
      };
    }

    // If x-parameter didn't work, try y as parameter
    delete baseVars[xAxisVar];
    baseVars[yAxisVar] = parameterValue;

    const resultY = solveTwoEquationSystem(
      formula1,
      formula2,
      baseVars,
      xAxisVar,
      zVar
    );
    if (resultY) {
      return {
        x: resultY.x,
        y: parameterValue,
        z: resultY.y,
      };
    }

    return null;
  } catch (error) {
    console.debug("Error computing surface intersection:", error);
    return null;
  }
}

/**
 * Solves a system of two equations for two unknowns
 */
function solveTwoEquationSystem(
  equation1: string,
  equation2: string,
  knownVars: Record<string, number>,
  var1: string,
  var2: string
): { x: number; y: number } | null {
  try {
    // Parse both equations
    const [left1, right1] = equation1.split("=").map((s) => s.trim());
    const [left2, right2] = equation2.split("=").map((s) => s.trim());

    // Create expressions for both sides of both equations
    const expr1Left = math.parse(left1);
    const expr1Right = math.parse(right1);
    const expr2Left = math.parse(left2);
    const expr2Right = math.parse(right2);

    // Try to solve using linear system approach
    // Set up system: A * [var1; var2] = B
    const scope = { ...knownVars };

    // Calculate coefficients by evaluating at test points
    scope[var1] = 0;
    scope[var2] = 0;
    const f1_00 =
      expr1Left.compile().evaluate(scope) -
      expr1Right.compile().evaluate(scope);
    const f2_00 =
      expr2Left.compile().evaluate(scope) -
      expr2Right.compile().evaluate(scope);

    scope[var1] = 1;
    scope[var2] = 0;
    const f1_10 =
      expr1Left.compile().evaluate(scope) -
      expr1Right.compile().evaluate(scope);
    const f2_10 =
      expr2Left.compile().evaluate(scope) -
      expr2Right.compile().evaluate(scope);

    scope[var1] = 0;
    scope[var2] = 1;
    const f1_01 =
      expr1Left.compile().evaluate(scope) -
      expr1Right.compile().evaluate(scope);
    const f2_01 =
      expr2Left.compile().evaluate(scope) -
      expr2Right.compile().evaluate(scope);

    // Calculate linear coefficients
    const a11 = f1_10 - f1_00; // coefficient of var1 in equation 1
    const a12 = f1_01 - f1_00; // coefficient of var2 in equation 1
    const a21 = f2_10 - f2_00; // coefficient of var1 in equation 2
    const a22 = f2_01 - f2_00; // coefficient of var2 in equation 2

    const b1 = -f1_00; // constant term in equation 1
    const b2 = -f2_00; // constant term in equation 2

    // Solve 2x2 linear system using Cramer's rule
    const det = a11 * a22 - a12 * a21;

    if (Math.abs(det) > 1e-10) {
      const x = (b1 * a22 - b2 * a12) / det;
      const y = (a11 * b2 - a21 * b1) / det;

      if (isFinite(x) && isFinite(y)) {
        return { x, y };
      }
    }

    return null;
  } catch (error) {
    console.debug("Error solving two equation system:", error);
    return null;
  }
}
