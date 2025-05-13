/**
 * Symbolic Algebra Engine for Formulize
 * 
 * This module provides symbolic algebra capability for the Formulize API
 * using math.js for formula parsing, variable substitution, and evaluation.
 */

import * as math from 'mathjs';
import { FormulizeFormula, FormulizeComputation } from './Formulize';

/**
 * Processes a formula string to replace variable names with math.js symbols
 * Variable names in the formula should be wrapped in curly braces: {variableName}
 * @param formulaStr The formula string with variables in curly braces
 * @returns A processed formula ready for math.js parsing
 */
function processFormulaString(formulaStr: string): string {
  // Replace {variableName} with variableName
  return formulaStr.replace(/\{([^}]+)\}/g, '$1');
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
  formula: FormulizeFormula,
  computation: FormulizeComputation,
  dependentVars: string[]
): (variables: Record<string, any>) => Record<string, any> {
  if (!computation.formula) {
    throw new Error("No symbolic formula provided in computation.formula");
  }

  // Process the formula string for math.js
  const processedFormula = processFormulaString(computation.formula);
  
  // Try to parse the formula with math.js
  try {
    const parsedExpression = math.parse(processedFormula);
    
    // Get all input variables needed for this formula
    const inputVarNames = Object.entries(formula.variables)
      .filter(([_, varDef]) => varDef.type !== 'dependent')
      .map(([varName]) => varName);
    
    // Create a function that evaluates the expression for all dependent variables
    return function(variables: Record<string, any>): Record<string, any> {
      try {
        const result: Record<string, any> = {};
        
        // For each dependent variable, try to solve the equation
        for (const dependentVar of dependentVars) {
          // If there's an explicit mapping function for this variable, use it
          if (computation.mappings && typeof computation.mappings[dependentVar] === 'function') {
            result[dependentVar] = computation.mappings[dependentVar](variables);
            continue;
          }
          
          // Otherwise, try to solve it symbolically
          // We'll use math.js's evaluate function with the provided variables
          const scope = { ...variables };
          
          // Special case: If the formula is an equation like `y = x + 1`,
          // and we're solving for y, we can directly evaluate the right side
          const equationMatch = processedFormula.match(
            new RegExp(`${dependentVar}\\s*=\\s*(.+)`)
          );
          
          if (equationMatch) {
            // Extract the right side of the equation and evaluate it
            const rightSide = equationMatch[1];
            result[dependentVar] = math.evaluate(rightSide, scope);
          } else {
            // For more complex cases, we can use math.js's built-in solve
            // capabilities, or try to rearrange the formula to isolate the variable
            
            // For now, we'll attempt a direct evaluation and hope the formula
            // is structured correctly. This is a simplification and would need
            // to be enhanced for complex formulas.
            try {
              result[dependentVar] = math.evaluate(processedFormula, scope);
            } catch (error) {
              console.error(`Could not solve for ${dependentVar} symbolically`, error);
              result[dependentVar] = NaN;
            }
          }
        }
        
        return result;
      } catch (error) {
        console.error("Error evaluating symbolic formula:", error);
        // Return NaN for all dependent variables on error
        return Object.fromEntries(dependentVars.map(v => [v, NaN]));
      }
    };
  } catch (error) {
    console.error("Failed to parse symbolic formula:", error);
    throw new Error(`Failed to parse symbolic formula: ${error}`);
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
  formula: FormulizeFormula,
  computation: FormulizeComputation,
  variables: Record<string, any>
): Record<string, any> {
  try {
    // Get all dependent variables
    const dependentVars = Object.entries(formula.variables)
      .filter(([_, varDef]) => varDef.type === 'dependent')
      .map(([varName]) => varName);
    
    // No dependent variables, nothing to compute
    if (dependentVars.length === 0) {
      return {};
    }
    
    // Derive the evaluation function
    const evaluationFunction = deriveSymbolicFunction(formula, computation, dependentVars);
    
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