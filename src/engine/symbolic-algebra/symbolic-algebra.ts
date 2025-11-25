/**
 * Symbolic Algebra Engine for Formulize
 *
 * This module provides symbolic algebra capability for the Formulize API
 * using math.js for formula parsing, variable substitution, and evaluation.
 */
import * as math from "mathjs";

import { IVariable } from "../../types/variable";

/**
 * Translates a variable name to be compatible with Math.js by replacing
 * invalid characters with underscores
 * @param variableName The original variable name that may contain invalid characters
 * @returns A Math.js compatible variable name
 */
function translateVariableName(variableName: string): string {
  // Replace any character that's not a letter, digit, underscore, or dollar sign with underscore
  // Also ensure it starts with a valid character (letter, underscore, or dollar sign)
  let translated = variableName.replace(/[^a-zA-Z0-9_$]/g, "_");

  // Ensure it starts with a valid character
  if (!/^[a-zA-Z_$]/.test(translated)) {
    translated = "_" + translated;
  }

  // Avoid reserved words by adding prefix if needed
  const reservedWords = ["mod", "to", "in", "and", "xor", "or", "not", "end"];
  if (reservedWords.includes(translated.toLowerCase())) {
    translated = "var_" + translated;
  }

  return translated;
}

/**
 * Creates a mapping from original variable names to Math.js compatible names
 * @param variableNames Array of original variable names
 * @returns Object mapping original names to translated names
 */
function createVariableTranslationMap(
  variableNames: string[]
): Record<string, string> {
  const translationMap: Record<string, string> = {};

  for (const originalName of variableNames) {
    const translatedName = translateVariableName(originalName);
    translationMap[originalName] = translatedName;
  }

  return translationMap;
}

/**
 * Extracts variable names from a formula string that are wrapped in curly braces
 * @param formulaStr The formula string with variables in curly braces
 * @returns Array of variable names found in the formula
 */
function extractVariableNames(formulaStr: string): string[] {
  const matches = formulaStr.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((match) => match.slice(1, -1)); // Remove curly braces
}

/**
 * Safely converts a Math.js result to a number array
 * @param result The result from math.evaluate()
 * @returns A number array or null if conversion fails
 */
function toNumberArray(result: unknown): number[] | null {
  // Handle Math.js DenseMatrix
  if (result && typeof result === "object" && "_data" in result) {
    const data = (result as { _data: unknown })._data;
    return Array.isArray(data) && data.every((x) => typeof x === "number")
      ? data
      : null;
  }

  // Handle regular arrays
  if (Array.isArray(result) && result.every((x) => typeof x === "number")) {
    return result;
  }

  return null;
}

/**
 * Tries to evaluate a matrix expression and assign results to variables
 * @param expr The expression to evaluate
 * @param scope The current variable scope
 * @param translatedComputedVars Array of translated computed variable names
 * @param unresolved Set of unresolved variables
 * @param result The result object to update
 * @param reverseTranslationMap Map from translated names back to original names
 * @returns true if successfully handled as matrix expression, false otherwise
 */
function tryEvaluateMatrixExpression(
  expr: string,
  scope: Record<string, number>,
  translatedDependentVars: string[],
  unresolved: Set<string>,
  result: Record<string, number>,
  reverseTranslationMap: Record<string, string>
): boolean {
  // Match matrix pattern: [var1, var2, ...] = expression
  const matrixMatch = expr.match(/^\s*\[(.*?)\]\s*=\s*(.+)$/);
  if (!matrixMatch) return false;

  const [, leftSide, rightSide] = matrixMatch;
  const leftVarNames = leftSide
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (leftVarNames.length === 0) return false;

  try {
    const rightResult = math.evaluate(rightSide, scope);
    const resultArray = toNumberArray(rightResult);

    if (!resultArray || resultArray.length !== leftVarNames.length) {
      return false;
    }

    // Assign each component to its corresponding variable
    let anyAssigned = false;
    for (let i = 0; i < leftVarNames.length; i++) {
      const varName = leftVarNames[i];
      const value = resultArray[i];

      if (
        translatedDependentVars.includes(varName) &&
        unresolved.has(varName)
      ) {
        const originalVarName = reverseTranslationMap[varName] || varName;
        result[originalVarName] = value;
        scope[varName] = value;
        unresolved.delete(varName);
        anyAssigned = true;
      }
    }

    return anyAssigned;
  } catch (error) {
    console.error(`⚠️ Could not evaluate matrix expression ${expr}:`, error);
    return false;
  }
}

/**
 * Processes a formula string to replace variable names with math.js symbols
 * and applies variable name translation for Math.js compatibility
 * Variable names in the formula should be wrapped in curly braces: {variableName}
 * @param formulaStr The formula string with variables in curly braces
 * @param translationMap Mapping from original variable names to translated names
 * @returns A processed formula ready for math.js parsing
 */
function processFormulaString(
  formulaStr: string,
  translationMap: Record<string, string>
): string {
  // Replace {variableName} with translated variableName
  return formulaStr.replace(/\{([^}]+)\}/g, (_match, variableName) => {
    return translationMap[variableName] || translateVariableName(variableName);
  });
}

/**
 * Derives a JavaScript function from a symbolic formula that computes
 * computed variables based on input variables
 *
 * @param expressions The expressions extracted from formula objects
 * @param computedVars Names of the computed variables to solve for
 * @param translationMap Mapping from original variable names to translated names
 * @returns A JavaScript function that evaluates the formula
 */
export function deriveSymbolicFunction(
  expressions: string[],
  computedVars: string[],
  translationMap: Record<string, string>
): (variables: Record<string, number>) => Record<string, number> {
  const processedExpressions = expressions.map((expr: string) =>
    processFormulaString(expr, translationMap)
  );

  // Create reverse translation map for results
  const reverseTranslationMap: Record<string, string> = {};
  for (const [original, translated] of Object.entries(translationMap)) {
    reverseTranslationMap[translated] = original;
  }

  return function (variables: Record<string, number>): Record<string, number> {
    const result: Record<string, number> = {};

    // Create scope with translated variable names
    const scope: Record<string, number> = {};
    for (const [originalName, value] of Object.entries(variables)) {
      const translatedName =
        translationMap[originalName] || translateVariableName(originalName);
      scope[translatedName] = value;
    }

    // Translate computed variable names for processing
    const translatedComputedVars = computedVars.map(
      (depVar) => translationMap[depVar] || translateVariableName(depVar)
    );

    const unresolved = new Set(translatedComputedVars);

    // Keep propagating changes until all variables are resolved or no progress
    while (unresolved.size > 0) {
      const initialUnresolvedCount = unresolved.size;

      for (const expr of processedExpressions) {
        // Check for matrix expressions first
        if (
          tryEvaluateMatrixExpression(
            expr,
            scope,
            translatedComputedVars,
            unresolved,
            result,
            reverseTranslationMap
          )
        ) {
          continue; // Successfully handled as matrix expression
        }

        // Regular scalar pattern matching for individual variables
        for (const depVar of unresolved) {
          // Check pattern: depVar = expression
          const match1 = expr.match(new RegExp(`^\\s*${depVar}\\s*=\\s*(.+)$`));
          if (match1) {
            try {
              const evalResult = math.evaluate(match1[1], scope) as number;
              const originalVarName = reverseTranslationMap[depVar] || depVar;
              result[originalVarName] = evalResult;
              scope[depVar] = evalResult;
              unresolved.delete(depVar);
              break; // Move to next expression since we found a match
            } catch (error) {
              console.error(
                `⚠️ Could not evaluate ${depVar} = ${match1[1]}:`,
                error
              );
              // Can't evaluate yet, dependencies not ready
            }
          }

          // Check pattern: expression = depVar
          const match2 = expr.match(
            new RegExp(`^\\s*(.+?)\\s*=\\s*${depVar}\\s*$`)
          );
          if (match2) {
            try {
              const evalResult = math.evaluate(match2[1], scope) as number;
              const originalVarName = reverseTranslationMap[depVar] || depVar;
              result[originalVarName] = evalResult;
              scope[depVar] = evalResult;
              unresolved.delete(depVar);
              break; // Move to next expression since we found a match
            } catch (error) {
              console.error(
                `⚠️ Could not evaluate ${match2[1]} = ${depVar}:`,
                error
              );
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
 * Computes the formula with the given variable values.
 * Variables should already be normalized (typically from the computation store).
 */
export function computeWithSymbolicEngine(
  expressions: string[],
  storeVariables: Record<string, IVariable>,
  inputValues: Record<string, number>
): Record<string, number> {
  try {
    if (!storeVariables || Object.keys(storeVariables).length === 0) {
      console.warn("⚠️ No variables provided");
      return {};
    }

    if (!expressions || expressions.length === 0) {
      console.warn("⚠️ No expressions provided");
      return {};
    }

    // Get all variable names for translation map
    const allVariableNames = Object.keys(storeVariables);

    // Create translation map for all variables
    const translationMap = createVariableTranslationMap(allVariableNames);

    // Get all computed variables
    const computedVars = Object.entries(storeVariables)
      .filter(([, varDef]) => varDef.role === "computed")
      .map(([varName]) => varName);

    // No computed variables, nothing to compute
    if (computedVars.length === 0) {
      console.warn("⚠️ No computed variables found");
      return {};
    }

    // Derive the evaluation function with translation map
    const evaluationFunction = deriveSymbolicFunction(
      expressions,
      computedVars,
      translationMap
    );

    // Execute the function with the current variable values
    const result = evaluationFunction(inputValues);

    return result;
  } catch (error) {
    console.error("Error computing with symbolic engine:", error);
    return {};
  }
}

/**
 * Generates symbolic derivatives for a formula
 * Useful for advanced analysis and optimization
 *
 * @param formulaStr The formula expression to differentiate
 * @param variableName The variable to differentiate with respect to
 * @returns The symbolic derivative
 */
export function deriveSymbolicDerivative(
  formulaStr: string,
  variableName: string
): string {
  try {
    // Extract all variable names from the formula
    const variableNames = extractVariableNames(formulaStr);
    // Add the differentiation variable if not already present
    if (!variableNames.includes(variableName)) {
      variableNames.push(variableName);
    }
    // Create translation map for all variables
    const translationMap = createVariableTranslationMap(variableNames);
    const processedFormula = processFormulaString(formulaStr, translationMap);
    const parsedExpression = math.parse(processedFormula);
    // Use translated variable name for differentiation
    const translatedVariableName =
      translationMap[variableName] || translateVariableName(variableName);
    const derivative = math.derivative(
      parsedExpression,
      translatedVariableName
    );
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
    // Extract all variable names from the formula
    const variableNames = extractVariableNames(formulaStr);
    // Create translation map for all variables
    const translationMap = createVariableTranslationMap(variableNames);
    const processedFormula = processFormulaString(formulaStr, translationMap);
    const simplified = math.simplify(processedFormula);
    return simplified.toString();
  } catch (error) {
    console.error("Error simplifying formula:", error);
    return formulaStr;
  }
}
