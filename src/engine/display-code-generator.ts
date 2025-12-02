import { ISemantics } from "../types/computation";
import { IVariable } from "../types/variable";

export interface DisplayCodeGeneratorContext {
  semantics: ISemantics | null;
  variables: Map<string, IVariable>;
  getComputedVariableSymbols: () => string[];
  getInputVariableSymbols: () => string[];
}

/**
 * Generate display code for the symbolic algebra engine
 */
export function generateSymbolicAlgebraDisplayCode(
  expressions: string[],
  context: DisplayCodeGeneratorContext
): string {
  const computedVars = context.getComputedVariableSymbols();

  // Generate evaluation function that matches what's really used by SymbolicAlgebraEngine
  let functionCode = `function evaluate(variables) {
  // Using symbolic algebra engine with math.js
  // Expressions: ${expressions.join(", ")}

  try {`;

  // Add input variable declarations
  const inputVars = context.getInputVariableSymbols();

  inputVars.forEach((varName) => {
    functionCode += `
    var ${varName} = variables.${varName};`;
  });

  // Structure the code to match the real implementation
  functionCode += `
    
    // Create a scope object with input variables
    const scope = { ...variables };
    const result = {};
`;

  // For each computed variable, find its expression and generate code
  computedVars.forEach((varName) => {
    functionCode += `
    // Calculate ${varName}`;

    // Check if there's an explicit mapping function in the config
    if (
      context.semantics?.mappings &&
      typeof context.semantics.mappings[varName] === "function"
    ) {
      // Use the mapping function if available
      functionCode += `
    // Using custom mapping function
    result.${varName} = computation.mappings.${varName}(variables);`;
    } else {
      // Find the expression that defines this variable
      let foundExpression = false;

      for (const expression of expressions) {
        const processedExpression = expression.replace(/\{([^}]+)\}/g, "$1");

        // Check if variable is on the left side: varName = ...
        const leftSideMatch = processedExpression.match(
          new RegExp(`^\\s*${varName}\\s*=\\s*(.+)`)
        );
        if (leftSideMatch) {
          const rightSide = leftSideMatch[1];
          functionCode += `
    // Found expression: ${varName} = ${rightSide}
    result.${varName} = math.evaluate("${rightSide}", scope);`;
          foundExpression = true;
          break;
        }

        // Check if variable is on the right side: ... = varName
        const rightSideMatch = processedExpression.match(
          new RegExp(`^\\s*(.+?)\\s*=\\s*${varName}\\s*$`)
        );
        if (rightSideMatch) {
          const leftSide = rightSideMatch[1];
          functionCode += `
    // Found expression: ${leftSide} = ${varName}
    result.${varName} = math.evaluate("${leftSide}", scope);`;
          foundExpression = true;
          break;
        }
      }

      if (!foundExpression) {
        functionCode += `
    // No explicit equation found for ${varName}, trying to solve from expressions
    result.${varName} = NaN;`;
      }
    }
  });

  // Return the results
  functionCode += `

    return result;
  } catch (error) {
    console.error("Error in symbolic algebra evaluation:", error);
    return { ${computedVars.map((v) => `${v}: NaN`).join(", ")} };
  }
}`;

  return functionCode;
}

/**
 * Generate display code for the manual engine
 */
export function generateManualDisplayCode(
  context: DisplayCodeGeneratorContext
): string {
  const computedVars = context.getComputedVariableSymbols();

  // Check if we have formulas with manual functions instead of mappings
  const hasManualFunctions = Array.from(context.variables.values()).some(
    (variable) => variable.role === "computed"
  );

  if (!hasManualFunctions) {
    return "// No computed variables found for manual engine";
  }

  // Generate evaluation function that shows the manual functions in formulas
  let functionCode = `function evaluate(variables) {
  // Using manual engine with custom JavaScript functions defined in formulas
  // Looking for manual functions in formula definitions

  try {
    const result = {};
`;

  // For each computed variable, show that it will be computed by manual functions
  computedVars.forEach((varName) => {
    functionCode += `
    // ${varName} will be computed by manual function in formula definition
    result.${varName} = manualFunction_${varName}(variables);`;
  });

  functionCode += `

    return result;
  } catch (error) {
    console.error("Error in manual engine evaluation:", error);
    return { ${computedVars.map((v) => `${v}: NaN`).join(", ")} };
  }
}`;

  return functionCode;
}

/**
 * Generate display code for LLM-generated functions
 */
export function generateLLMDisplayCode(
  generatedCode: string,
  expressions: string[]
): string {
  return `// LLM-generated evaluation function
// Based on expressions: ${expressions.join(", ")}
${generatedCode}`;
}
