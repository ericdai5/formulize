import { action, observable, toJS } from "mobx";

import { computeWithManualEngine } from "../engine/manual/manual";
import { computeWithSymbolicEngine } from "../engine/symbolic-algebra/symbolic-algebra";
import { IManual, ISemantics } from "../types/computation";
import { IEnvironment } from "../types/environment";
import { IFormula } from "../types/formula";
import { INPUT_VARIABLE_DEFAULT, IValue, IVariable } from "../types/variable";
import { AugmentedFormula } from "../util/parse/formula-tree";

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

  // Processed formula trees with cssId values assigned to nodes
  // Maps formula ID to the AugmentedFormula tree after variable processing
  // Used for DOM element lookup during expression bounding box calculations
  @observable
  accessor formulaTrees = new Map<string, AugmentedFormula>();

  @observable
  accessor engine: "symbolic-algebra" | "manual" = "manual";

  @observable
  accessor semantics: ISemantics | null = null;

  @observable
  accessor symbolicFunctions: string[] = [];

  @observable
  accessor formulas: IFormula[] = [];

  @observable
  accessor manual: IManual | null = null;

  @observable
  accessor environment: IEnvironment | null = null;

  @observable
  accessor variableRolesChanged = 0;

  accessor isDragging = false;

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

  isStepMode(): boolean {
    return this.semantics?.mode === "step";
  }

  get evaluateFormula(): EvaluationFunction | null {
    return this.evaluationFunction;
  }

  @action
  setSemantics(config: ISemantics | null) {
    this.semantics = config;
  }

  @action
  setEngine(engine: "symbolic-algebra" | "manual") {
    this.engine = engine;
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
    this.formulaTrees.clear();
    this.environment = null;
    this.symbolicFunctions = [];
    this.formulas = [];
    this.manual = null;
    this.evaluationFunction = null;
    // Remove custom CSS style element
    const styleElement = document.getElementById("custom-var-styles");
    if (styleElement) {
      styleElement.remove();
    }
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
  setSymbolicFunctions(expressions: string[]) {
    this.symbolicFunctions = expressions;
  }

  @action
  setFormulas(formulas: IFormula[]) {
    this.formulas = formulas;
  }

  @action
  setManual(manual: IManual | null): void {
    this.manual = manual;
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
    // Re-run computation to update dependent variables
    this.runComputation();
  }

  @action
  setSetValue(id: string, set: (string | number)[]) {
    const variable = this.variables.get(id);
    if (!variable) {
      return false;
    }
    variable.value = set;
    // Re-run computation to update dependent variables
    this.runComputation();
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
  async setComputation(expressions: string[], manual?: IManual | null) {
    this.setSymbolicFunctions(expressions);
    this.setManual(manual ?? null);
    // Set up the evaluation function to handle all expressions
    if (this.engine === "symbolic-algebra" && this.semantics) {
      this.evaluationFunction =
        this.createMultiExpressionEvaluator(expressions);
    } else if (this.engine === "manual" && this.semantics) {
      // For manual engine, create an evaluator using manual functions
      this.evaluationFunction = this.createManualEvaluator();
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
  // The manual function directly mutates the store's observable variables via proxy
  private createManualEvaluator(): EvaluationFunction {
    return () => {
      if (!this.environment) return {};
      // Pass the store's observable variables directly (same references)
      // The proxy in manual.ts will mutate them, triggering MobX reactivity
      const storeVariables: Record<string, IVariable> = {};
      for (const [varName, variable] of this.variables.entries()) {
        storeVariables[varName] = variable; // Same reference, not a copy
      }
      // Get computation-level manual function
      const computationManual = this.semantics?.manual;
      // Run the manual function - it mutates variables directly via proxy
      computeWithManualEngine(storeVariables, computationManual);
      // No need to sync back or return values - mutations happen directly
      return {};
    };
  }

  @action
  addVariable(id: string, variableDefinition?: Partial<IVariable>) {
    if (!this.variables.has(id)) {
      this.variables.set(id, {
        value: variableDefinition?.value ?? undefined,
        dataType: variableDefinition?.dataType,
        dimensions: variableDefinition?.dimensions,
        units: variableDefinition?.units,
        name: variableDefinition?.name,
        precision:
          variableDefinition?.precision ?? INPUT_VARIABLE_DEFAULT.PRECISION,
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
        input: variableDefinition?.input,
      });
    }
  }

  @action
  setVariableInput(id: string, input: "drag" | "inline" | undefined) {
    const variable = this.variables.get(id);
    if (!variable) {
      return;
    }

    if (variable.input === input) {
      return;
    }

    variable.input = input;

    // Get the environment variable if it exists and set default range for drag input
    if (input === "drag" && !variable.range) {
      if (this.environment?.variables) {
        const envVar = this.environment.variables[id];
        if (envVar && typeof envVar !== "number" && envVar.range) {
          variable.range = envVar.range;
        } else {
          variable.range = [-10, 10];
        }
      } else {
        variable.range = [-10, 10];
      }
    }

    this.variableRolesChanged++;
  }

  /**
   * Trigger computation by running the manual function.
   * The manual function directly mutates observable variables via proxy.
   */
  @action
  runComputation() {
    if (!this.evaluationFunction) return;
    try {
      this.evaluationFunction({});
    } catch (error) {
      console.error("Error running computation:", error);
    }
  }

  getDebugState() {
    return {
      variables: Array.from(this.variables.entries()).map(([id, v]) => ({
        id,
        value: v.value,
        input: v.input,
      })),
      hasFunction: !!this.evaluationFunction,
      engine: this.engine,
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
