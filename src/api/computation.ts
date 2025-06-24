import { action, observable } from "mobx";

import { IComputation } from ".";
import { IEnvironment } from "../types/environment";
import { IVariable } from "../types/variable";
import {
  DisplayCodeGeneratorContext,
  generateLLMDisplayCode,
  generateManualDisplayCode,
  generateSymbolicAlgebraDisplayCode,
} from "./computation-engines/display-code-generator";
import { generateEvaluationFunction as generateLLMFunction } from "./computation-engines/llm/llm-function-generator";
import { computeWithManualEngine } from "./computation-engines/manual/manual";
import { computeWithSymbolicEngine } from "./computation-engines/symbolic-algebra/symbolic-algebra";

export type EvaluationFunction = (
  variables: Record<string, number>
) => Record<string, number>;

class ComputationStore {
  @observable
  accessor variables = new Map<string, IVariable>();

  @observable
  accessor lastGeneratedCode: string | null = null;

  @observable
  accessor computationEngine: "llm" | "symbolic-algebra" | "manual" = "llm";

  @observable
  accessor computationConfig: IComputation | null = null;

  @observable
  accessor displayedFormulas: string[] = [];

  @observable
  accessor symbolicFunctions: string[] = [];

  @observable
  accessor manualFunctions: ((
    variables: Record<string, IVariable>
  ) => number)[] = [];

  @observable
  accessor environment: IEnvironment | null = null;

  @observable
  accessor variableTypesChanged = 0;

  private evaluationFunction: EvaluationFunction | null = null;
  private isUpdatingDependents = false;
  private isInitializing = false;

  private hasDependentVars(): boolean {
    return Array.from(this.variables.values()).some(
      (v) => v.type === "dependent"
    );
  }

  private getDependentVars(): IVariable[] {
    return Array.from(this.variables.values()).filter(
      (v) => v.type === "dependent"
    );
  }

  private getDependentVarSymbols(): string[] {
    return Array.from(this.variables.entries())
      .filter(([, v]) => v.type === "dependent")
      .map(([id]) => id);
  }

  private getInputVarSymbols(): string[] {
    return Array.from(this.variables.entries())
      .filter(([, v]) => v.type === "input")
      .map(([id]) => id);
  }

  private getDisplayCodeGeneratorContext(): DisplayCodeGeneratorContext {
    return {
      computationConfig: this.computationConfig,
      variables: this.variables,
      getDependentVariableSymbols: () => this.getDependentVarSymbols(),
      getInputVariableSymbols: () => this.getInputVarSymbols(),
    };
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
  clearAllVariables() {
    this.variables.clear();
  }

  @action
  setVariableTypesChanged(value: number) {
    this.variableTypesChanged = value;
  }

  @action
  setDisplayedFormulas(formulas: string[]) {
    this.displayedFormulas = formulas;
  }

  @action
  setSymbolicFunctions(expressions: string[]) {
    this.symbolicFunctions = expressions;
  }

  @action
  setManualFunctions(
    manual: ((variables: Record<string, IVariable>) => number)[]
  ): void {
    this.manualFunctions = manual;
  }

  @action
  setEnvironment(environment: IEnvironment) {
    this.environment = environment;
  }

  @action
  setValue(id: string, value: number) {
    const variable = this.variables.get(id);
    if (!variable) {
      console.log(`setValue: Variable not found: ${id}`);
      return;
    }
    variable.value = value;

    // Update any mapped variables that use this variable as their key
    this.updateMappedVariables(id, value);

    // Only update dependent variables if we're not initializing and not already in an update cycle
    if (!this.isUpdatingDependents && !this.isInitializing) {
      this.updateAllDependentVars();
    }
  }

  // Resolve any key-map relationships after all variables have been added
  @action
  resolveKeyMapRelationships() {
    for (const variable of this.variables.values()) {
      if (variable.key && variable.map) {
        const keyVariable = this.variables.get(variable.key);
        if (keyVariable && keyVariable.value !== undefined) {
          const mappedValue = variable.map[keyVariable.value];
          if (mappedValue !== undefined) {
            variable.value = mappedValue;
          }
        }
      }
    }
  }

  // Update variables that have a map based on a key variable
  @action
  private updateMappedVariables(keyVariableId: string, keyValue: number) {
    // Find all variables that use this variable as their key
    for (const variable of this.variables.values()) {
      if (variable.key === keyVariableId && variable.map) {
        // Look up the mapped value for this key
        const mappedValue = variable.map[keyValue];
        if (mappedValue !== undefined) {
          // Update the mapped variable's value without triggering recursive updates
          variable.value = mappedValue;
        }
      }
    }
  }

  // Set up all expressions for computation
  @action
  async setComputation(
    expressions: string[],
    manual: ((variables: Record<string, IVariable>) => number)[]
  ) {
    this.setSymbolicFunctions(expressions);
    this.setManualFunctions(manual);

    // Set up the evaluation function to handle all expressions
    if (
      this.computationEngine === "symbolic-algebra" &&
      this.computationConfig
    ) {
      this.evaluationFunction =
        this.createMultiExpressionEvaluator(expressions);
      const displayCode = generateSymbolicAlgebraDisplayCode(
        expressions,
        this.getDisplayCodeGeneratorContext()
      );
      this.setLastGeneratedCode(displayCode);
    } else if (this.computationEngine === "llm") {
      // For LLM engine, create a multi-expression evaluator using the LLM approach
      await this.createLLMMultiExpressionEvaluator(expressions);
    } else if (this.computationEngine === "manual" && this.computationConfig) {
      // For manual engine, create an evaluator using manual functions
      this.evaluationFunction = this.createManualEvaluator();
      const displayCode = generateManualDisplayCode(
        this.getDisplayCodeGeneratorContext()
      );
      this.setLastGeneratedCode(displayCode);
    }

    // Initial evaluation of all dependent variables
    this.updateAllDependentVars();
  }

  // Create an evaluation function that handles multiple expressions
  private createMultiExpressionEvaluator(
    expressions: string[]
  ): EvaluationFunction {
    return (variables: Record<string, number>) => {
      if (!this.computationConfig || !this.environment) return {};

      // Use expressions if available
      if (!expressions || expressions.length === 0) {
        console.warn("No expressions available for symbolic algebra engine");
        return {};
      }

      // Evaluate using the symbolic algebra engine with the stored environment directly
      try {
        const symbolResult = computeWithSymbolicEngine(
          this.environment,
          this.computationConfig,
          variables
        );
        return symbolResult;
      } catch (error) {
        console.error("❌ Error in multi-expression evaluation:", error);
        return {};
      }
    };
  }

  // Create an evaluation function for manual engine using manual functions
  private createManualEvaluator(): EvaluationFunction {
    return (variables) => {
      if (!this.environment) return {};
      // Sync incoming variable values with the environment's variable definitions
      if (this.environment.variables) {
        for (const [symbol, value] of Object.entries(variables)) {
          const envVar = this.environment.variables[symbol];
          if (envVar) {
            envVar.value = value;
          }
        }
      }
      return computeWithManualEngine(this.environment);
    };
  }

  @action
  addVariable(id: string, variableDefinition?: Partial<IVariable>) {
    if (!this.variables.has(id)) {
      this.variables.set(id, {
        value: variableDefinition?.value ?? 0,
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
        set: variableDefinition?.set,
        key: variableDefinition?.key,
        map: variableDefinition?.map,
      });

      // If this variable has a key-map relationship, update its value based on the key variable
      if (variableDefinition?.key && variableDefinition?.map) {
        const keyVariable = this.variables.get(variableDefinition.key);
        if (keyVariable && keyVariable.value !== undefined) {
          const mappedValue = variableDefinition.map[keyVariable.value];
          if (mappedValue !== undefined) {
            this.variables.get(id)!.value = mappedValue;
          }
        }
      }
    }
  }

  @action
  setVariableType(id: string, type: IVariable["type"]) {
    const variable = this.variables.get(id);
    if (!variable) {
      return;
    }

    variable.type = type;

    // Get the environment variable if it exists
    if (this.environment?.variables) {
      const envVar = this.environment.variables[id];
      if (envVar && envVar.type === "input" && !variable.range) {
        variable.range = envVar.range || [-10, 10];
      }
    } else if (type === "input" && !variable.range) {
      // Only set default range if no range is already defined
      variable.range = [-10, 10];
    }

    this.variableTypesChanged++;

    // Check if we have dependent variables and expressions to evaluate
    const hasDependentVars = this.hasDependentVars();

    if (hasDependentVars && this.symbolicFunctions.length > 0) {
      // Re-evaluate all expressions when variable types change
      this.setComputation(this.symbolicFunctions, this.manualFunctions);
    } else if (!hasDependentVars) {
      // Clear evaluation function if no dependent variables
      this.evaluationFunction = null;
      this.lastGeneratedCode = null;
    }

    // Update all dependent variables
    this.updateAllDependentVars();
  }

  @action
  updateAllDependentVars() {
    if (!this.evaluationFunction) return;

    try {
      this.isUpdatingDependents = true;
      const values = Object.fromEntries(
        Array.from(this.variables.entries()).map(([symbol, v]) => [
          symbol,
          v.value ?? 0,
        ])
      );
      const results = this.evaluationFunction(values);
      // Update all dependent variables with their computed values
      for (const [symbol, variable] of this.variables.entries()) {
        if (variable.type === "dependent") {
          const result = results[symbol];
          if (typeof result === "number" && !isNaN(result)) {
            variable.value = result;
          }
        }
      }
    } catch (error) {
      console.error("Error updating dependent variables:", error);
    } finally {
      this.isUpdatingDependents = false;
    }
  }

  getDebugState() {
    return {
      variables: Array.from(this.variables.entries()).map(([id, v]) => ({
        id,
        value: v.value,
        type: v.type,
      })),
      lastGeneratedCode: this.lastGeneratedCode,
      hasFunction: !!this.evaluationFunction,
      computationEngine: this.computationEngine,
      displayedFormulas: this.displayedFormulas,
      computationFunctions: this.symbolicFunctions,
    };
  }

  // Create an LLM-based multi-expression evaluator
  private async createLLMMultiExpressionEvaluator(expressions: string[]) {
    const dependentVars = this.getDependentVars();

    if (dependentVars.length === 0) {
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

      const dependentVars = this.getDependentVarSymbols();
      const inputVars = this.getInputVarSymbols();

      // Generate function code via LLM
      const functionCode = await generateLLMFunction({
        formula: primaryExpression,
        dependentVars,
        inputVars,
      });

      const displayCode = generateLLMDisplayCode(functionCode, expressions);
      this.setLastGeneratedCode(displayCode);
      this.evaluationFunction = new Function(
        "variables",
        `"use strict";\n${functionCode}\nreturn evaluate(variables);`
      ) as EvaluationFunction;
    } catch (error) {
      console.error("Error creating LLM multi-expression evaluator:", error);
    }
  }
}

export const computationStore = new ComputationStore();

// window for debugging
(window as unknown as Record<string, unknown>).computationStore =
  computationStore;
