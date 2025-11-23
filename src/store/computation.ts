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
import { IValue, IVariable } from "../types/variable";

export type EvaluationFunction = (
  variables: Record<string, number>
) => Record<string, IValue>;

class ComputationStore {
  @observable
  accessor variables = new Map<string, IVariable>();

  // Observable hover state - only components observing specific keys will re-render
  @observable
  accessor hoverStates = new Map<string, boolean>();

  @observable
  accessor showHoverOutlines: boolean = false;

  @observable
  accessor showVariableBorders: boolean = false;

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
    vars: Record<string, IValue>
  ) => IValue | void)[] = [];

  @observable
  accessor environment: IEnvironment | null = null;

  @observable
  accessor variableRolesChanged = 0;

  accessor isDragging = false;

  @observable
  accessor activeIndices = new Map<string, number>();

  @observable
  accessor processedIndices = new Map<string, Set<number>>();

  // Track injected custom CSS to avoid re-injecting on re-renders
  @observable
  accessor injectedDefaultCSS = new Map<string, string>();

  @observable
  accessor injectedHoverCSS = new Map<string, string>();

  private evaluationFunction: EvaluationFunction | null = null;
  private isUpdatingDependents = false;
  private isInitializing = false;

  private hasDependentVars(): boolean {
    return Array.from(this.variables.values()).some(
      (v) => v.role === "dependent"
    );
  }

  private getDependentVars(): IVariable[] {
    return Array.from(this.variables.values()).filter(
      (v) => v.role === "dependent"
    );
  }

  private getDependentVarSymbols(): string[] {
    return Array.from(this.variables.entries())
      .filter(([, v]) => v.role === "dependent")
      .map(([id]) => id);
  }

  private getInputVarSymbols(): string[] {
    return Array.from(this.variables.entries())
      .filter(([, v]) => v.role === "input")
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
    this.hoverStates.clear();
    this.injectedDefaultCSS.clear();
    this.injectedHoverCSS.clear();
    this.environment = null;
    this.symbolicFunctions = [];
    this.manualFunctions = [];
    this.evaluationFunction = null;
    this.displayedFormulas = [];
    // Remove custom CSS style element
    const styleElement = document.getElementById("custom-var-styles");
    if (styleElement) {
      styleElement.remove();
    }
  }

  @action
  setVariableRolesChanged(value: number) {
    this.variableRolesChanged = value;
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
    manual: ((vars: Record<string, IValue>) => IValue | void)[]
  ): void {
    this.manualFunctions = manual;
  }

  @action
  setEnvironment(environment: IEnvironment) {
    // Validate and normalize fontSize, setting default if not provided
    const validatedFontSize =
      environment.fontSize !== undefined
        ? typeof environment.fontSize === "number" &&
          environment.fontSize >= 0.5 &&
          environment.fontSize <= 1
          ? environment.fontSize
          : 0.8
        : 0.8; // Default fontSize when not defined

    // Always set environment with validated fontSize
    this.environment = {
      ...environment,
      fontSize: validatedFontSize,
    };
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
  setSetValue(id: string, set: (string | number)[]) {
    const variable = this.variables.get(id);
    if (!variable) {
      return false;
    }
    variable.value = set; // Use unified value field
    // Trigger re-evaluation of dependent variables (including sets via manual functions)
    if (!this.isUpdatingDependents && !this.isInitializing) {
      this.updateAllDependentVars();
    }
    return true;
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

  @action
  setVariableHover(id: string, hover: boolean) {
    this.hoverStates.set(id, hover);
  }

  getVariableHover(id: string): boolean {
    return this.hoverStates.get(id) ?? false;
  }

  @observable
  accessor refreshCallback: (() => void) | null = null;

  @action
  setRefreshCallback(callback: (() => void) | null) {
    this.refreshCallback = callback;
  }

  // Resolve memberOf relationships after all variables have been added
  @action
  resolveMemberOfRelationships() {
    for (const [, variable] of this.variables.entries()) {
      if (variable.memberOf) {
        const parentVar = this.variables.get(variable.memberOf);
        if (parentVar && Array.isArray(parentVar.value)) {
          // Set default value to first element if child doesn't have a value, no index, and not in step mode
          if (
            variable.value === undefined &&
            parentVar.value.length > 0 &&
            !variable.index &&
            !this.isStepMode()
          ) {
            variable.value =
              typeof parentVar.value[0] === "number"
                ? parentVar.value[0]
                : parseFloat(String(parentVar.value[0]));
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
    if (changedVariable.key && Array.isArray(changedVariable.value)) {
      const keyVariable = this.variables.get(changedVariable.key);
      if (keyVariable && Array.isArray(keyVariable.value)) {
        // Find the index of the changed value in the changed variable's set
        const changedIndex = changedVariable.value.indexOf(changedValue);
        if (changedIndex !== -1 && changedIndex < keyVariable.value.length) {
          // Update the key variable's value using the same index
          const keyValue = keyVariable.value[changedIndex];
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
        Array.isArray(variable.value) &&
        varId !== changedVariableId
      ) {
        if (Array.isArray(changedVariable.value)) {
          // Find the index of the changed value in the changed variable's set
          const changedIndex = changedVariable.value.indexOf(changedValue);
          if (changedIndex !== -1 && changedIndex < variable.value.length) {
            // Update the dependent variable's value using the same index
            const setValue = variable.value[changedIndex];
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
    manual: ((vars: Record<string, IValue>) => IValue | void)[]
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
      const result = computeWithManualEngine({
        ...this.environment,
        variables: updatedVariables,
      });

      // After manual execution, sync back any set changes from manual functions
      for (const [varName, variable] of Object.entries(updatedVariables)) {
        const computationVar = this.variables.get(varName);
        if (computationVar && Array.isArray(variable.value)) {
          computationVar.value = variable.value;
        }
      }

      return result;
    };
  }

  @action
  addVariable(id: string, variableDefinition?: Partial<IVariable>) {
    if (!this.variables.has(id)) {
      this.variables.set(id, {
        value: variableDefinition?.value ?? undefined,
        role: variableDefinition?.role ?? "constant",
        dataType: variableDefinition?.dataType,
        dimensions: variableDefinition?.dimensions,
        units: variableDefinition?.units,
        name: variableDefinition?.name,
        precision: variableDefinition?.precision,
        description: variableDefinition?.description,
        range: variableDefinition?.range,
        step: variableDefinition?.step,
        options: variableDefinition?.options,
        key: variableDefinition?.key,
        memberOf: variableDefinition?.memberOf,
        latexDisplay: variableDefinition?.latexDisplay ?? "name",
        labelDisplay: variableDefinition?.labelDisplay ?? "value",
        index: variableDefinition?.index,
        svgPath: variableDefinition?.svgPath,
        svgContent: variableDefinition?.svgContent,
        svgSize: variableDefinition?.svgSize,
        svgMode: variableDefinition?.svgMode,
        defaultCSS: variableDefinition?.defaultCSS,
        hoverCSS: variableDefinition?.hoverCSS,
      });
    }
  }

  @action
  setVariableRole(id: string, role: IVariable["role"]) {
    const variable = this.variables.get(id);
    if (!variable) {
      return;
    }

    variable.role = role;

    // Get the environment variable if it exists
    if (this.environment?.variables) {
      const envVar = this.environment.variables[id];
      if (envVar && envVar.role === "input" && !variable.range) {
        variable.range = envVar.range || [-10, 10];
      }
    } else if (role === "input" && !variable.range) {
      // Only set default range if no range is already defined
      variable.range = [-10, 10];
    }

    this.variableRolesChanged++;

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
          .filter(
            ([, v]) => v.value !== undefined && typeof v.value === "number"
          )
          .map(([symbol, v]) => [symbol, v.value as number])
      );
      const results = this.evaluationFunction(values);
      // Update all dependent variables with their computed values
      for (const [symbol, variable] of this.variables.entries()) {
        if (variable.role === "dependent") {
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
        role: v.role,
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
