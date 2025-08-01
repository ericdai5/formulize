import { action, observable, toJS } from "mobx";

import {
  DisplayCodeGeneratorContext,
  generateLLMDisplayCode,
  generateManualDisplayCode,
  generateSymbolicAlgebraDisplayCode,
} from "../engine/display-code-generator";
import { generateEvaluationFunction as generateLLMFunction } from "../engine/llm/llm-function-generator";
import { computeWithManualEngine } from "../engine/manual/manual";
import { computeWithSymbolicEngine } from "../engine/symbolic-algebra/symbolic-algebra";
import { IComputation } from "../types/computation";
import { IEnvironment } from "../types/environment";
import { IVariable } from "../types/variable";

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

  @observable
  accessor isDragging = false;

  @observable
  accessor activeIndices = new Map<string, number>();

  @observable
  accessor processedIndices = new Map<string, Set<number>>();

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

  isStepMode(): boolean {
    return this.computationConfig?.mode === "step";
  }

  get evaluateFormula(): EvaluationFunction | null {
    return this.evaluationFunction;
  }

  @action
  setLastGeneratedCode(code: string | null) {
    this.lastGeneratedCode = code;
  }

  @action
  setComputationConfig(config: IComputation | null) {
    this.computationConfig = config;
  }

  @action
  setComputationEngine(engine: "llm" | "symbolic-algebra" | "manual") {
    this.computationEngine = engine;
  }

  @action
  setInitializing(initializing: boolean) {
    this.isInitializing = initializing;
  }

  @action
  reset() {
    this.variables.clear();
    this.environment = null;
    this.symbolicFunctions = [];
    this.manualFunctions = [];
    this.evaluationFunction = null;
    this.displayedFormulas = [];
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
      return false;
    }
    variable.value = value;
    // Update index-based dependent variables
    this.updateIndexBasedVariables(id, value);
    // Only update dependent variables if we're not initializing and not already in an update cycle
    if (!this.isUpdatingDependents && !this.isInitializing) {
      this.updateAllDependentVars();
    }
  }

  @action
  setValueInStepMode(id: string, value: number): boolean {
    const variable = this.variables.get(id);
    if (!variable) {
      return false;
    }
    variable.value = value;
    return true;
  }

  @action
  setDragging(dragging: boolean) {
    this.isDragging = dragging;
  }

  @action
  setActiveIndex(id: string, index: number) {
    this.activeIndices.set(id, index);
  }

  @action
  clearActiveIndices() {
    this.activeIndices.clear();
  }

  @action
  addProcessedIndex(id: string, index: number) {
    if (!this.processedIndices.has(id)) {
      this.processedIndices.set(id, new Set());
    }
    this.processedIndices.get(id)!.add(index);
  }

  @action
  clearProcessedIndices() {
    this.processedIndices.clear();
  }

  @action
  clearProcessedIndicesForVariable(id: string) {
    this.processedIndices.delete(id);
  }

  @observable
  accessor refreshCallback: (() => void) | null = null;

  @action
  setRefreshCallback(callback: (() => void) | null) {
    this.refreshCallback = callback;
  }

  // Resolve any key-set relationships after all variables have been added
  @action
  resolveKeySetRelationships() {
    for (const variable of this.variables.values()) {
      if (variable.key && variable.set) {
        const keyVariable = this.variables.get(variable.key);
        if (keyVariable && keyVariable.set && keyVariable.value !== undefined) {
          const keyIndex = keyVariable.set.indexOf(keyVariable.value);
          if (keyIndex !== -1 && keyIndex < variable.set.length) {
            const setValue = variable.set[keyIndex];
            variable.value =
              typeof setValue === "number"
                ? setValue
                : parseFloat(String(setValue));
          }
        }
      }
    }
  }

  // Resolve memberOf relationships after all variables have been added
  @action
  resolveMemberOfRelationships() {
    for (const [, variable] of this.variables.entries()) {
      if (variable.memberOf) {
        const parentVar = this.variables.get(variable.memberOf);
        if (parentVar?.set) {
          variable.set = [...parentVar.set];
          // If the parent variable has a value, set this variable's value to match
          if (
            parentVar.value !== undefined &&
            parentVar.set.includes(parentVar.value)
          ) {
            variable.value = parentVar.value;
          } else if (parentVar.set.length > 0 && !variable.index && !this.isStepMode()) {
            // Only set default to first element if this variable doesn't have an index
            // AND we're not in step mode (variables should only get values during manual execution)
            variable.value =
              typeof parentVar.set[0] === "number"
                ? parentVar.set[0]
                : parseFloat(String(parentVar.set[0]));
          }
        }
      }
    }
  }

  // Update variables that have a set based on a key variable (bidirectional index-based matching)
  @action
  private updateIndexBasedVariables(
    changedVariableId: string,
    changedValue: number
  ) {
    const changedVariable = this.variables.get(changedVariableId);
    if (!changedVariable) return;

    // Case 1: The changed variable has a key (depends on another variable)
    if (changedVariable.key && changedVariable.set) {
      const keyVariable = this.variables.get(changedVariable.key);
      if (keyVariable && keyVariable.set) {
        // Find the index of the changed value in the changed variable's set
        const changedIndex = changedVariable.set.indexOf(changedValue);
        if (changedIndex !== -1 && changedIndex < keyVariable.set.length) {
          // Update the key variable's value using the same index
          const keyValue = keyVariable.set[changedIndex];
          keyVariable.value =
            typeof keyValue === "number"
              ? keyValue
              : parseFloat(String(keyValue));
        }
      }
    }

    // Case 2: Other variables depend on the changed variable (changed variable is a key)
    for (const [varId, variable] of this.variables.entries()) {
      if (
        variable.key === changedVariableId &&
        variable.set &&
        varId !== changedVariableId
      ) {
        if (changedVariable.set) {
          // Find the index of the changed value in the changed variable's set
          const changedIndex = changedVariable.set.indexOf(changedValue);
          if (changedIndex !== -1 && changedIndex < variable.set.length) {
            // Update the dependent variable's value using the same index
            const setValue = variable.set[changedIndex];
            variable.value =
              typeof setValue === "number"
                ? setValue
                : parseFloat(String(setValue));
          }
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

    // Initial evaluation of all dependent variables (skip in step mode)
    if (!this.isStepMode()) {
      this.updateAllDependentVars();
    }
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
      // Create environment with updated variables from computation store
      const updatedVariables: Record<string, IVariable> = {};
      for (const [varName, computationVar] of this.variables.entries()) {
        updatedVariables[varName] = {
          ...computationVar,
          value: variables[varName] ?? computationVar.value,
        };
      }
      return computeWithManualEngine({
        ...this.environment,
        variables: updatedVariables,
      });
    };
  }

  @action
  addVariable(id: string, variableDefinition?: Partial<IVariable>) {
    if (!this.variables.has(id)) {
      this.variables.set(id, {
        value: variableDefinition?.value ?? undefined,
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
        memberOf: variableDefinition?.memberOf,
        display: variableDefinition?.display,
        labelDisplay: variableDefinition?.labelDisplay,
        index: variableDefinition?.index,
      });

      // If this variable has a key-set relationship, update its value based on the key variable
      if (variableDefinition?.key && variableDefinition?.set) {
        const keyVariable = this.variables.get(variableDefinition.key);
        if (keyVariable && keyVariable.set && keyVariable.value !== undefined) {
          const keyIndex = keyVariable.set.indexOf(keyVariable.value);
          if (keyIndex !== -1 && keyIndex < variableDefinition.set.length) {
            const setValue = variableDefinition.set[keyIndex];
            this.variables.get(id)!.value =
              typeof setValue === "number"
                ? setValue
                : parseFloat(String(setValue));
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
        Array.from(this.variables.entries())
          .filter(([, v]) => v.value !== undefined)
          .map(([symbol, v]) => [symbol, v.value!])
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

  // Get resolved variables as a plain object for external use
  // This is the total collection of variables after the system
  // has processed the user-written variables settings.
  // Converts MobX observables to plain JavaScript objects for serialization.
  getVariables(): Record<string, IVariable> {
    const variables: Record<string, IVariable> = {};
    for (const [varName, variable] of this.variables.entries()) {
      variables[varName] = toJS(variable);
    }
    return variables;
  }

  // Create an LLM-based multi-expression evaluator
  private async createLLMMultiExpressionEvaluator(expressions: string[]) {
    const dependentVars = this.getDependentVars();

    if (dependentVars.length === 0) {
      return;
    }

    try {
      // Use the first expression for LLM generation (maintain backward compatibility)
      const primaryExpression = expressions[0] || "";

      if (!primaryExpression.trim()) {
        return;
      }

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
