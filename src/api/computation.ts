import { action, observable } from "mobx";

import { IComputation } from ".";
import { IVariable } from "../types/variable";
import { generateEvaluationFunction as generateLLMFunction } from "./computation-engines/llm-function-generator";
import { computeWithSymbolicEngine } from "./computation-engines/symbolic-algebra";

export interface ComputationVariable extends Omit<IVariable, "value"> {
  value: number;
  symbol: string;
  error?: string;
}

// Map the new type values to match existing functionality
export type VariableType = IVariable["type"] | "none";
export type EvaluationFunction = (
  variables: Record<string, number>
) => Record<string, number>;

class ComputationStore {
  @observable
  accessor variables = new Map<string, ComputationVariable>();

  @observable
  accessor lastGeneratedCode: string | null = null;

  @observable
  accessor computationEngine: "llm" | "symbolic-algebra" | "manual" = "llm";

  @observable
  accessor computationConfig: IComputation | null = null;

  @observable
  accessor displayedFormulas: string[] = [];

  @observable
  accessor computationFunctions: string[] = [];

  @observable
  accessor variableTypesChanged = 0;

  private evaluationFunction: EvaluationFunction | null = null;
  private isUpdatingDependents = false;
  private isInitializing = false;

  // Helper methods for dependent variable operations
  private hasDependentVariables(): boolean {
    return Array.from(this.variables.values()).some(
      (v) => v.type === "dependent"
    );
  }

  private getDependentVariables(): ComputationVariable[] {
    return Array.from(this.variables.values()).filter(
      (v) => v.type === "dependent"
    );
  }

  private getDependentVariableSymbols(): string[] {
    return Array.from(this.variables.values())
      .filter((v) => v.type === "dependent")
      .map((v) => v.symbol);
  }

  private getInputVariableSymbols(): string[] {
    return Array.from(this.variables.values())
      .filter((v) => v.type !== "dependent")
      .map((v) => v.symbol);
  }

  get evaluateFormula(): EvaluationFunction | null {
    return this.evaluationFunction;
  }

  @action
  setLastGeneratedCode(code: string | null) {
    this.lastGeneratedCode = code;
  }

  @action
  setInitializing(initializing: boolean) {
    this.isInitializing = initializing;
  }

  @action
  setValue(id: string, value: number) {
    const variable = this.variables.get(id);
    if (!variable) {
      console.log(`setValue: Variable not found: ${id}`);
      return;
    }
    variable.value = value;

    // Only update dependent variables if we're not initializing and not already in an update cycle
    if (!this.isUpdatingDependents && !this.isInitializing) {
      this.updateAllDependentVariables();
    }
  }

  // Set up all expressions for computation
  @action
  async setAllExpressions(expressions: string[]) {
    this.computationFunctions = expressions;

    // Set up the evaluation function to handle all expressions
    if (
      this.computationEngine === "symbolic-algebra" &&
      this.computationConfig
    ) {
      this.evaluationFunction = this.createMultiExpressionEvaluator();
      this.generateSymbolicAlgebraDisplayCode(expressions);
    } else if (this.computationEngine === "llm") {
      // For LLM engine, create a multi-expression evaluator using the LLM approach
      await this.createLLMMultiExpressionEvaluator(expressions);
    }

    // Initial evaluation of all dependent variables
    this.updateAllDependentVariables();
  }

  // Create an evaluation function that handles multiple expressions
  private createMultiExpressionEvaluator(): EvaluationFunction {
    return (variables: Record<string, number>) => {
      if (!this.computationConfig) return {};
      const result: Record<string, number> = {};

      // Create formulas from the stored expressions
      const formulas = this.computationFunctions.map((expression, index) => ({
        name: `Formula ${index + 1}`,
        function: `Formula ${index + 1}`, // LaTeX display (not used for computation)
        expression: expression, // The computational expression
      }));

      // Create a formula object for the symbolic engine
      const formulaObj = {
        formulas: formulas, // ✅ Now includes actual formulas with expressions
        variables: Object.fromEntries(
          Array.from(this.variables.entries()).map(([id, v]) => {
            const varType: "constant" | "input" | "dependent" =
              v.type === "constant"
                ? "constant"
                : v.type === "input"
                  ? "input"
                  : v.type === "dependent"
                    ? "dependent"
                    : "constant";
            return [v.symbol, { type: varType } as const];
          })
        ),
        computation: this.computationConfig,
      };

      // Evaluate using the symbolic algebra engine
      try {
        const symbolResult = computeWithSymbolicEngine(
          formulaObj,
          this.computationConfig,
          variables
        );

        // Merge results
        Object.assign(result, symbolResult);
      } catch (error) {
        console.error("❌ Error in multi-expression evaluation:", error);
      }

      return result;
    };
  }

  @action
  addVariable(
    id: string,
    symbol: string,
    variableDefinition?: Partial<IVariable>
  ) {
    if (!this.variables.has(id)) {
      this.variables.set(id, {
        value: variableDefinition?.value ?? 0,
        symbol: symbol,
        type: variableDefinition?.type ?? "constant",
        dataType: variableDefinition?.dataType,
        dimensions: variableDefinition?.dimensions,
        units: variableDefinition?.units,
        label: variableDefinition?.label,
        precision: variableDefinition?.precision,
        description: variableDefinition?.description,
        range: variableDefinition?.range,
        step: variableDefinition?.step,
        options: variableDefinition?.options,
      });
    }
  }

  @action
  cleanup(currentVariables: Set<string>) {
    const variablesToRemove = new Set<string>();

    // Check which variables need to be removed
    for (const [id, variable] of this.variables.entries()) {
      if (!currentVariables.has(variable.symbol)) {
        variablesToRemove.add(id);
      }
    }

    if (variablesToRemove.size > 0) {
      variablesToRemove.forEach((id) => {
        this.variables.delete(id);
      });

      // Check if we still have dependent variables
      const hasDependentVariables = this.hasDependentVariables();

      if (!hasDependentVariables) {
        this.setLastGeneratedCode(null);
        this.evaluationFunction = null;
      }
    }

    // Re-evaluate expressions if we still have expressions and dependent variables
    const hasDependentVars = this.hasDependentVariables();

    if (hasDependentVars && this.computationFunctions.length > 0) {
      this.setAllExpressions(this.computationFunctions);
    }
  }

  @action
  setVariableType(id: string, type: VariableType) {
    const variable = this.variables.get(id);
    if (!variable) {
      return;
    }

    if (type === "none") {
      variable.type = "constant";
    } else {
      variable.type = type;
    }
    variable.error = undefined;

    if (type === "input") {
      variable.range = [-100, 100];
    }

    this.variableTypesChanged++;

    // Check if we have dependent variables and expressions to evaluate
    const hasDependentVariables = this.hasDependentVariables();

    if (hasDependentVariables && this.computationFunctions.length > 0) {
      // Re-evaluate all expressions when variable types change
      this.setAllExpressions(this.computationFunctions);
    } else if (!hasDependentVariables) {
      // Clear evaluation function if no dependent variables
      this.evaluationFunction = null;
      this.lastGeneratedCode = null;
    }

    // Update all dependent variables
    this.updateAllDependentVariables();
  }

  @action
  updateAllDependentVariables() {
    if (!this.evaluationFunction) return;

    try {
      this.isUpdatingDependents = true;
      const values = Object.fromEntries(
        Array.from(this.variables.entries()).map(([, v]) => [v.symbol, v.value])
      );
      const results = this.evaluationFunction(values);

      // Update all dependent variables with their computed values
      for (const [, variable] of this.variables.entries()) {
        if (variable.type === "dependent") {
          const result = results[variable.symbol];
          if (typeof result === "number" && !isNaN(result)) {
            variable.value = result;
            variable.error = undefined;
          } else {
            variable.error = "Invalid computation result";
          }
        }
      }
    } catch (error) {
      console.error("Error updating dependent variables:", error);
      for (const [, variable] of this.variables.entries()) {
        if (variable.type === "dependent") {
          variable.error = "Evaluation error";
        }
      }
    } finally {
      this.isUpdatingDependents = false;
    }
  }

  getDebugState() {
    return {
      variables: Array.from(this.variables.entries()).map(([id, v]) => ({
        id,
        symbol: v.symbol,
        value: v.value,
        type: v.type,
      })),
      lastGeneratedCode: this.lastGeneratedCode,
      hasFunction: !!this.evaluationFunction,
      computationEngine: this.computationEngine,
      displayedFormulas: this.displayedFormulas,
      computationFunctions: this.computationFunctions,
    };
  }

  // Create an LLM-based multi-expression evaluator
  private async createLLMMultiExpressionEvaluator(expressions: string[]) {
    const dependentVariables = this.getDependentVariables();

    if (dependentVariables.length === 0) {
      console.log(
        "🔎 No dependent variables, skipping LLM function generation"
      );
      return;
    }

    try {
      // Use the first expression for LLM generation (maintain backward compatibility)
      const primaryExpression = expressions[0] || "";

      if (!primaryExpression.trim()) {
        console.log("🔎 No valid expression for LLM generation");
        return;
      }

      console.log("🚀 Generating LLM function for expressions:", expressions);

      const dependentVars = dependentVariables.map((v) => v.symbol);
      const inputVars = this.getInputVariableSymbols();

      // Generate function code via LLM
      const functionCode = await generateLLMFunction({
        formula: primaryExpression,
        dependentVars,
        inputVars,
      });

      this.setLastGeneratedCode(functionCode);
      this.evaluationFunction = new Function(
        "variables",
        `"use strict";\n${functionCode}\nreturn evaluate(variables);`
      ) as EvaluationFunction;
    } catch (error) {
      console.error("❌ Error creating LLM multi-expression evaluator:", error);
    }
  }

  // Generate display code for the symbolic algebra engine
  private generateSymbolicAlgebraDisplayCode(expressions: string[]) {
    const dependentVars = this.getDependentVariableSymbols();

    console.log("🔎 Generating display code for symbolic algebra engine");
    console.log("🔎 Dependent variables:", dependentVars);

    // Generate evaluation function that matches what's really used by SymbolicAlgebraEngine
    let functionCode = `function evaluate(variables) {
  // Using symbolic algebra engine with math.js
  // Expressions: ${expressions.join(", ")}

  try {`;

    // Add input variable declarations
    const inputVars = this.getInputVariableSymbols();

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

    // For each dependent variable, find its expression and generate code
    dependentVars.forEach((varName) => {
      functionCode += `
    // Calculate ${varName}`;

      // Check if there's an explicit mapping function in the config
      if (
        this.computationConfig?.mappings &&
        typeof this.computationConfig.mappings[varName] === "function"
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
    return { ${dependentVars.map((v) => `${v}: NaN`).join(", ")} };
  }
}`;
    this.setLastGeneratedCode(functionCode);
  }
}

export const computationStore = new ComputationStore();

// window for debugging
(window as unknown as Record<string, unknown>).computationStore =
  computationStore;
