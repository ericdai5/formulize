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
  return formulaStr.replace(/\{([^}]+)\}/g, (match, variableName) => {
    return translationMap[variableName] || translateVariableName(variableName);
  });
}

/**
 * Derives a JavaScript function from a symbolic formula that computes
 * dependent variables based on input variables
 *
 * @param expressions The expressions extracted from formula objects
 * @param dependentVars Names of the dependent variables to solve for
 * @param translationMap Mapping from original variable names to translated names
 * @returns A JavaScript function that evaluates the formula
 */
export function deriveSymbolicFunction(
  expressions: string[],
  dependentVars: string[],
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

    // Translate dependent variable names for processing
    const translatedDependentVars = dependentVars.map(
      (depVar) => translationMap[depVar] || translateVariableName(depVar)
    );

    const unresolved = new Set(translatedDependentVars);

    // Keep propagating changes until all variables are resolved or no progress
    while (unresolved.size > 0) {
      const initialUnresolvedCount = unresolved.size;

      for (const expr of processedExpressions) {
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
              console.log(
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
              console.log(
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

    // Get all variable names for translation map
    const allVariableNames = Object.keys(environment.variables);

    // Create translation map for all variables
    const translationMap = createVariableTranslationMap(allVariableNames);

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

    // Derive the evaluation function with translation map
    const evaluationFunction = deriveSymbolicFunction(
      expressions,
      dependentVars,
      translationMap
    );

    // Execute the function with the current variable values
    const result = evaluationFunction(variables);

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
