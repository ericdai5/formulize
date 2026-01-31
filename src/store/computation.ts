import { action, observable, toJS } from "mobx";

import { computeWithManualEngine } from "../engine/manual/manual";
import { computeWithSymbolicEngine } from "../engine/symbolic-algebra/symbolic-algebra";
import { AugmentedFormula } from "../parse/formula-tree";
import { IManual, ISemantics } from "../types/computation";
import { IEnvironment } from "../types/environment";
import { IRole, IValue, IVariable } from "../types/variable";

export type EvaluationFunctionInput = Record<string, number | number[]>;

export type EvaluationFunction = (
  variables: EvaluationFunctionInput
) => Record<string, IValue>;

class ComputationStore {
  @observable
  accessor variables = new Map<string, IVariable>();

  // Observable hover state - only components observing specific keys will re-render
  @observable
  accessor hoverStates = new Map<string, boolean>();

  // Node hover states for visualization nodes (node ID -> hover state)
  @observable
  accessor nodeHoverStates = new Map<string, boolean>();

  // Formula hover states (formula ID -> hover state)
  @observable
  accessor formulaHoverStates = new Map<string, boolean>();

  // Callbacks for formula hover changes (for visualizations to react)
  private formulaHoverCallbacks: Set<
    (formulaId: string, isHovered: boolean) => void
  > = new Set();

  // Mapping from formula IDs to node IDs (for bidirectional hover)
  @observable
  accessor formulaNodeMapping = new Map<string, string>();

  // Reverse mapping from node IDs to formula IDs
  @observable
  accessor nodeFormulaMapping = new Map<string, string>();

  @observable
  accessor showHoverOutlines: boolean = false;

  @observable
  accessor showVariableBorders: boolean = false;

  @observable
  accessor showExpressionNodes: boolean = false;

  // Expression scopes for bounding box calculations
  // Maps LaTeX expression strings to their generated scope IDs (e.g., "\\frac{1}{m}" -> "expr-0")
  @observable
  accessor expressionScopes = new Map<
    string,
    { scopeId: string; type: string; containsVars: string[] }
  >();

  // Counter for generating unique expression scope IDs
  private expressionScopeCounter = 0;

  // Processed formula trees with cssId values assigned to nodes
  // Maps formula ID to the AugmentedFormula tree after variable processing
  // Used for DOM element lookup during expression bounding box calculations
  @observable
  accessor formulaTrees = new Map<string, AugmentedFormula>();

  @observable
  accessor lastGeneratedCode: string | null = null;

  @observable
  accessor engine: "llm" | "symbolic-algebra" | "manual" = "llm";

  @observable
  accessor semantics: ISemantics | null = null;

  @observable
  accessor displayedFormulas: string[] = [];

  @observable
  accessor symbolicFunctions: string[] = [];

  @observable
  accessor manualFunctions: IManual[] = [];

  @observable
  accessor environment: IEnvironment | null = null;

  @observable
  accessor variableRolesChanged = 0;

  accessor isDragging = false;

  @observable
  accessor activeIndices = new Map<string, number>();

  @observable
  accessor processedIndices = new Map<string, Set<number>>();

  // Fresh variable dimensions from DOM measurements (varId -> { x, y, width, height })
  // Updated by updateVarNodes, used by calculateBoundingBoxFromVariableNodes
  @observable
  accessor variableDimensions = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();

  // Track injected custom CSS to avoid re-injecting on re-renders
  @observable
  accessor injectedDefaultCSS = new Map<string, string>();

  @observable
  accessor injectedHoverCSS = new Map<string, string>();

  private evaluationFunction: EvaluationFunction | null = null;
  private isUpdatingDependents = false;
  private isInitializing = false;

  private hasComputedVars(): boolean {
    return Array.from(this.variables.values()).some(
      (v) => v.role === "computed"
    );
  }

  isStepMode(): boolean {
    return this.semantics?.mode === "step";
  }

  get evaluateFormula(): EvaluationFunction | null {
    return this.evaluationFunction;
  }

  @action
  setLastGeneratedCode(code: string | null) {
    this.lastGeneratedCode = code;
  }

  @action
  setSemantics(config: ISemantics | null) {
    this.semantics = config;
  }

  @action
  setEngine(engine: "llm" | "symbolic-algebra" | "manual") {
    this.engine = engine;
  }

  @action
  setInitializing(initializing: boolean) {
    this.isInitializing = initializing;
  }

  @action
  reset() {
    this.variables.clear();
    this.hoverStates.clear();
    this.nodeHoverStates.clear();
    this.formulaHoverStates.clear();
    this.formulaNodeMapping.clear();
    this.nodeFormulaMapping.clear();
    this.formulaHoverCallbacks.clear();
    this.injectedDefaultCSS.clear();
    this.injectedHoverCSS.clear();
    this.expressionScopes.clear();
    this.formulaTrees.clear();
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

  /**
   * Register an expression scope for bounding box calculations.
   * Called during LaTeX processing to track structural elements.
   * @param latexExpression - The LaTeX expression string (e.g., "\\frac{1}{m} \\sum_{i=1}^{m}")
   * @param type - The type of structure (e.g., "sum", "frac", "delim")
   * @param containsVars - Array of variable IDs contained within this scope
   * @returns The generated scope ID that was assigned to this expression
   */
  @action
  registerExpressionScope(
    latexExpression: string,
    type: string,
    containsVars: string[]
  ): string {
    // Check if this expression is already registered
    const existing = this.expressionScopes.get(latexExpression);
    if (existing) {
      return existing.scopeId;
    }
    const scopeId = `expr-${this.expressionScopeCounter++}`;
    this.expressionScopes.set(latexExpression, { scopeId, type, containsVars });
    return scopeId;
  }

  /**
   * Normalize a LaTeX expression for comparison
   * Removes \limits, extra spaces, normalizes braces, and normalizes backslashes
   */
  private normalizeLatex(latex: string): string {
    return latex
      .replace(/\\\\/g, "\\") // Normalize double backslashes to single
      .replace(/\\limits/g, "") // Remove \limits
      .replace(/\s+/g, "") // Remove all whitespace
      .replace(/\{([a-zA-Z0-9])\}/g, "$1"); // Simplify single-char braces like {m} -> m
  }

  /**
   * Get all scope IDs that match parts of the given LaTeX expression
   * @param latexExpression - The LaTeX expression to look up
   * @returns Array of scope IDs that are contained in the expression
   */
  getScopeIdsForExpression(latexExpression: string): string[] {
    const normalizedInput = this.normalizeLatex(latexExpression);
    const matchedScopeIds: string[] = [];
    for (const [key, value] of this.expressionScopes.entries()) {
      const normalizedKey = this.normalizeLatex(key);
      // Check if the registered expression is contained in the user's input
      if (normalizedInput.includes(normalizedKey)) {
        matchedScopeIds.push(value.scopeId);
      }
    }
    return matchedScopeIds;
  }

  /**
   * Clear all expression scopes (called before re-processing LaTeX)
   */
  @action
  clearExpressionScopes() {
    this.expressionScopes.clear();
    this.expressionScopeCounter = 0;
  }

  /**
   * Store a processed formula tree for later DOM element lookup
   * @param formulaId - The formula ID
   * @param tree - The AugmentedFormula tree with cssId values assigned
   */
  @action
  setFormulaTree(formulaId: string, tree: AugmentedFormula) {
    this.formulaTrees.set(formulaId, tree);
  }

  /**
   * Get the stored formula tree for a formula
   * @param formulaId - The formula ID
   * @returns The AugmentedFormula tree or undefined if not found
   */
  getFormulaTree(formulaId: string): AugmentedFormula | undefined {
    return this.formulaTrees.get(formulaId);
  }

  /**
   * Clear all stored formula trees
   */
  @action
  clearFormulaTrees() {
    this.formulaTrees.clear();
  }

  /**
   * Update fresh dimensions for a variable (called during variable node creation/update)
   * @param varId - The variable ID
   * @param dimensions - The position and dimensions of the variable element
   */
  @action
  setVariableDimensions(
    varId: string,
    dimensions: { x: number; y: number; width: number; height: number }
  ) {
    this.variableDimensions.set(varId, dimensions);
  }

  /**
   * Get fresh dimensions for a variable
   * @param varId - The variable ID
   * @returns The dimensions or undefined if not found
   */
  getVariableDimensions(varId: string) {
    return this.variableDimensions.get(varId);
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
  setManualFunctions(manual: IManual[]): void {
    this.manualFunctions = manual;
  }

  @action
  setEnvironment(environment: IEnvironment) {
    // Validate and normalize fontSize, setting default if not provided
    // Valid range is 0.5 to 3.0 (em units for MathJax rendering)
    const validatedFontSize =
      environment.fontSize !== undefined
        ? typeof environment.fontSize === "number" &&
          environment.fontSize >= 0.5 &&
          environment.fontSize <= 3.0
          ? environment.fontSize
          : 1 // Invalid value, use default of 1em
        : 1; // Default fontSize when not defined (1em for good visibility)

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
    if (!this.isUpdatingDependents && !this.isInitializing) {
      this.updateAllComputedVars();
    }
  }

  @action
  setSetValue(id: string, set: (string | number)[]) {
    const variable = this.variables.get(id);
    if (!variable) {
      return false;
    }
    variable.value = set; // Use unified value field
    // Trigger re-evaluation of computed variables (including sets via manual functions)
    if (!this.isUpdatingDependents && !this.isInitializing) {
      this.updateAllComputedVars();
    }
    return true;
  }

  @action
  setValueInStepMode(id: string, value: IValue): boolean {
    const variable = this.variables.get(id);
    if (!variable) {
      return false;
    }
    variable.value = value as IValue;
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

  // ============= Bidirectional Hover System =============

  /**
   * Set the mapping between formula IDs and visualization node IDs
   */
  @action
  setFormulaNodeMapping(mapping: Record<string, string>) {
    this.formulaNodeMapping.clear();
    this.nodeFormulaMapping.clear();
    for (const [formulaId, nodeId] of Object.entries(mapping)) {
      this.formulaNodeMapping.set(formulaId, nodeId);
      this.nodeFormulaMapping.set(nodeId, formulaId);
    }
  }

  /**
   * Set hover state for a visualization node
   * This will trigger the corresponding formula to highlight
   */
  @action
  setNodeHover(nodeId: string, isHovered: boolean) {
    this.nodeHoverStates.set(nodeId, isHovered);
    // Find the corresponding formula and trigger its hover state
    const formulaId = this.nodeFormulaMapping.get(nodeId);
    if (formulaId) {
      this.setFormulaHover(formulaId, isHovered);
    }
  }

  /**
   * Get hover state for a visualization node
   */
  getNodeHover(nodeId: string): boolean {
    return this.nodeHoverStates.get(nodeId) ?? false;
  }

  /**
   * Set hover state for a formula
   * This notifies visualizations that a formula is being hovered
   */
  @action
  setFormulaHover(formulaId: string, isHovered: boolean) {
    const prevState = this.formulaHoverStates.get(formulaId) ?? false;
    if (prevState !== isHovered) {
      this.formulaHoverStates.set(formulaId, isHovered);
      // Notify all registered callbacks
      this.formulaHoverCallbacks.forEach((callback) => {
        callback(formulaId, isHovered);
      });
      // Also set the corresponding node hover state
      const nodeId = this.formulaNodeMapping.get(formulaId);
      if (nodeId && this.nodeHoverStates.get(nodeId) !== isHovered) {
        this.nodeHoverStates.set(nodeId, isHovered);
      }
    }
  }

  /**
   * Get hover state for a formula
   */
  getFormulaHover(formulaId: string): boolean {
    return this.formulaHoverStates.get(formulaId) ?? false;
  }

  /**
   * Subscribe to formula hover changes
   * Returns an unsubscribe function
   */
  onFormulaHoverChange(
    callback: (formulaId: string, isHovered: boolean) => void
  ): () => void {
    this.formulaHoverCallbacks.add(callback);
    return () => {
      this.formulaHoverCallbacks.delete(callback);
    };
  }

  // ============= End Bidirectional Hover System =============

  @observable
  accessor refreshCallback: (() => void) | null = null;

  @action
  setRefreshCallback(callback: (() => void) | null) {
    this.refreshCallback = callback;
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
    if (this.engine === "symbolic-algebra" && this.semantics) {
      this.evaluationFunction =
        this.createMultiExpressionEvaluator(expressions);
    } else if (this.engine === "manual" && this.semantics) {
      // For manual engine, create an evaluator using manual functions
      this.evaluationFunction = this.createManualEvaluator();
    }

    // Initial evaluation of all computed variables (skip in step mode)
    if (!this.isStepMode()) {
      this.updateAllComputedVars();
    }
  }

  // Create an evaluation function that handles multiple expressions
  private createMultiExpressionEvaluator(
    expressions: string[]
  ): EvaluationFunction {
    return (inputValues: EvaluationFunctionInput) => {
      // Use expressions if available
      if (!expressions || expressions.length === 0) {
        console.warn("No expressions available for symbolic algebra engine");
        return {};
      }

      // Evaluate using the symbolic algebra engine with the computation store variables
      try {
        const storeVariables = this.getVariables();
        // Filter to only numeric values for the symbolic algebra engine
        const numericInputValues: Record<string, number> = {};
        for (const [key, value] of Object.entries(inputValues)) {
          if (typeof value === "number") {
            numericInputValues[key] = value;
          }
        }
        const symbolResult = computeWithSymbolicEngine(
          expressions,
          storeVariables,
          numericInputValues
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
      // Create variables with updated values from computation store
      const updatedVariables: Record<string, IVariable> = {};
      for (const [varName, variable] of this.variables.entries()) {
        updatedVariables[varName] = {
          ...variable,
          value: variables[varName] ?? variable.value,
        };
      }

      // Get computation-level manual function
      const computationManual = this.semantics?.manual;
      const result = computeWithManualEngine(
        updatedVariables,
        computationManual
      );

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
        latexDisplay: variableDefinition?.latexDisplay ?? "name",
        labelDisplay: variableDefinition?.labelDisplay ?? "value",
        svgPath: variableDefinition?.svgPath,
        svgContent: variableDefinition?.svgContent,
        svgSize: variableDefinition?.svgSize,
        svgMode: variableDefinition?.svgMode,
        defaultCSS: variableDefinition?.defaultCSS,
        hoverCSS: variableDefinition?.hoverCSS,
        interaction: variableDefinition?.interaction,
      });
    }
  }

  @action
  setVariableRole(id: string, role: IRole) {
    const variable = this.variables.get(id);
    if (!variable) {
      return;
    }

    if (variable.role === role) {
      return;
    }

    variable.role = role;

    // Get the environment variable if it exists
    if (this.environment?.variables) {
      const envVar = this.environment.variables[id];
      // Check if envVar is an object (not a number) before accessing properties
      if (
        envVar &&
        typeof envVar !== "number" &&
        envVar.role === "input" &&
        !variable.range
      ) {
        variable.range = envVar.range || [-10, 10];
      }
    } else if (role === "input" && !variable.range) {
      // Only set default range if no range is already defined
      variable.range = [-10, 10];
    }

    this.variableRolesChanged++;

    // Check if we have computed variables and expressions to evaluate
    const hasComputedVars = this.hasComputedVars();

    if (hasComputedVars && this.symbolicFunctions.length > 0) {
      // Re-evaluate all expressions when variable types change
      this.setComputation(this.symbolicFunctions, this.manualFunctions);
    } else if (!hasComputedVars) {
      // Clear evaluation function if no computed variables
      this.evaluationFunction = null;
      this.lastGeneratedCode = null;
    }

    // Update all computed variables
    this.updateAllComputedVars();
  }

  @action
  updateAllComputedVars() {
    if (!this.evaluationFunction) return;

    try {
      this.isUpdatingDependents = true;
      // Include both numeric and array values for manual engine support
      const values: EvaluationFunctionInput = Object.fromEntries(
        Array.from(this.variables.entries())
          .filter(
            ([, v]) =>
              v.value !== undefined &&
              (typeof v.value === "number" || Array.isArray(v.value))
          )
          .map(([symbol, v]) => [symbol, v.value as number | number[]])
      );
      const results = this.evaluationFunction(values);
      // Update all computed variables with their computed values (numeric or array)
      for (const [symbol, variable] of this.variables.entries()) {
        if (variable.role === "computed") {
          const result = results[symbol];
          if (typeof result === "number" && !isNaN(result)) {
            variable.value = result;
          } else if (Array.isArray(result)) {
            variable.value = result;
          }
        }
      }
    } catch (error) {
      console.error("Error updating computed variables:", error);
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
      engine: this.engine,
      displayedFormulas: this.displayedFormulas,
      symbolicFunctions: this.symbolicFunctions,
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
}

/**
 * Factory function to create a new ComputationStore instance.
 * Used for creating scoped stores per FormulizeProvider.
 */
export function createComputationStore(): ComputationStore {
  return new ComputationStore();
}

// Export the class for type usage
export { ComputationStore };
