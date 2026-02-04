import { action, observable, toJS } from "mobx";

import { computeWithManualEngine } from "../engine/manual";
import { ISemantics } from "../types/computation";
import { IEnvironment } from "../types/environment";
import { IFormula } from "../types/formula";
import { IDataPoint } from "../types/graph";
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
  accessor semantics: ISemantics | null = null;

  @observable
  accessor formulas: IFormula[] = [];

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

  // Step mode - when enabled, labels show step values instead of live computed values
  @observable
  accessor stepping: boolean = false;

  private evaluationFunction: EvaluationFunction | null = null;

  isStepMode(): boolean {
    return this.stepping;
  }

  @action
  setStepping(enabled: boolean) {
    this.stepping = enabled;
  }

  get evaluateFormula(): EvaluationFunction | null {
    return this.evaluationFunction;
  }

  /**
   * Create a snapshot copy of all variables for sampling/computation.
   * Uses toJS to create deep copies that won't affect the original observables.
   */
  getVariablesSnapshot(): Record<string, IVariable> {
    const snapshot: Record<string, IVariable> = {};
    for (const [varName, variable] of this.variables.entries()) {
      snapshot[varName] = { ...toJS(variable) };
    }
    return snapshot;
  }

  @action
  setSemantics(config: ISemantics | null) {
    this.semantics = config;
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
    this.formulas = [];
    this.semantics = null;
    this.stepping = false;
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
  setFormulas(formulas: IFormula[]) {
    this.formulas = formulas;
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

  // Set up the semantics function for computation
  @action
  async setComputation() {
    // Set up the evaluation function if semantics is defined
    if (this.semantics) {
      this.evaluationFunction = this.createEvaluator();
    }
  }

  // Create an evaluation function using the semantics function
  // The function directly mutates the store's observable variables via proxy
  private createEvaluator(): EvaluationFunction {
    return () => {
      if (!this.environment) return {};
      // Pass the store's observable variables directly (same references)
      // The proxy in manual.ts will mutate them, triggering MobX reactivity
      const storeVariables: Record<string, IVariable> = {};
      for (const [varName, variable] of this.variables.entries()) {
        storeVariables[varName] = variable; // Same reference, not a copy
      }
      // Run the semantics function - it mutates variables directly via proxy
      computeWithManualEngine(storeVariables, this.semantics ?? undefined);
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
    };
  }

  // ============= Graph Data Collection =============

  /**
   * Extract a 2D point from dataPoints map.
   * @param dataPointMap - Map of graph ID to data points
   * @param graphId - The graph ID to look up
   * @returns The first valid {x, y} point or null
   */
  private extractPoint2D(
    dataPointMap: Map<string, IDataPoint[]>,
    graphId: string
  ): { x: number; y: number } | null {
    const dataPoints = dataPointMap.get(graphId);
    if (!dataPoints || dataPoints.length === 0) return null;
    const { x, y } = dataPoints[0];
    if (
      typeof x === "number" &&
      typeof y === "number" &&
      isFinite(x) &&
      isFinite(y)
    ) {
      return { x, y };
    }
    return null;
  }

  /**
   * Extract a 3D point from dataPoints map.
   * @param dataPoints - Map of graph ID to data points
   * @param graphId - The graph ID to look up
   * @returns The first valid {x, y, z} point or null
   */
  private extractPoint3D(
    dataPointMap: Map<string, IDataPoint[]>,
    graphId: string
  ): { x: number; y: number; z: number } | null {
    const dataPoints = dataPointMap.get(graphId);
    if (!dataPoints || dataPoints.length === 0) return null;
    const { x, y, z } = dataPoints[0];
    if (
      typeof x === "number" &&
      typeof y === "number" &&
      typeof z === "number" &&
      isFinite(x) &&
      isFinite(y) &&
      isFinite(z)
    ) {
      return { x, y, z };
    }
    return null;
  }

  /**
   * Run semantics function with given variables and extract a 2D point.
   * @param variables - Variable values to use
   * @param graphId - Graph ID to match data2d() calls
   * @returns The {x, y} point or null
   */
  private computeAndExtract2D(
    variables: Record<string, IVariable>,
    graphId: string
  ): { x: number; y: number } | null {
    if (!this.semantics || typeof this.semantics !== "function") return null;
    const result = computeWithManualEngine(variables, this.semantics);
    return this.extractPoint2D(result.dataPointMap, graphId);
  }

  /**
   * Run semantics function with given variables and extract a 3D point.
   * @param variables - Variable values to use
   * @param graphId - Graph ID to match data3d() calls
   * @returns The {x, y, z} point or null
   */
  private computeAndExtract3D(
    variables: Record<string, IVariable>,
    graphId: string
  ): { x: number; y: number; z: number } | null {
    if (!this.semantics || typeof this.semantics !== "function") return null;
    const result = computeWithManualEngine(variables, this.semantics);
    return this.extractPoint3D(result.dataPointMap, graphId);
  }

  /**
   * Generic helper to sample the semantic function across a parameter range.
   * Varies a single parameter across its range and collects points using the provided extractor.
   *
   * @param parameter - The variable to vary during sampling
   * @param range - The range to sample [min, max]
   * @param samples - Number of samples
   * @param graphId - Graph ID to match data calls
   * @param extractor - Function to extract point from variables (computeAndExtract2D or computeAndExtract3D)
   * @returns Array of extracted points
   */
  private sampleWithParameter<T>(
    parameter: string,
    range: [number, number],
    samples: number,
    graphId: string,
    extractor: (
      variables: Record<string, IVariable>,
      graphId: string
    ) => T | null
  ): T[] {
    const [min, max] = range;
    const step = (max - min) / samples;
    const points: T[] = [];
    const baseVariables = this.getVariablesSnapshot();
    for (let i = 0; i <= samples; i++) {
      const paramValue = min + i * step;
      baseVariables[parameter] = {
        ...baseVariables[parameter],
        value: paramValue,
      };
      const point = extractor(baseVariables, graphId);
      if (point) points.push(point);
    }
    return points;
  }

  /**
   * Run the semantic function once with current values to get the current 2D point.
   * Reads x, y values from the dataPoints (from explicit data2d() calls).
   *
   * @param graphId - Graph ID to match data2d() calls
   * @returns The current {x, y} point or null
   */
  sample2DPoint(graphId: string): { x: number; y: number } | null {
    return this.computeAndExtract2D(this.getVariablesSnapshot(), graphId);
  }

  /**
   * Run the semantic function once with current values to get the current 3D point.
   * Reads x, y, z values from the dataPoints (from explicit data3d() calls).
   *
   * @param graphId - Graph ID to match graph() calls
   * @returns The current {x, y, z} point or null
   */
  sample3DPoint(graphId: string): { x: number; y: number; z: number } | null {
    return this.computeAndExtract3D(this.getVariablesSnapshot(), graphId);
  }

  /**
   * Sample the semantic function across a parameter range to collect 2D line data.
   * Reads x, y values from the dataPoints (from explicit data2d() calls).
   *
   * @param parameter - The variable to vary during sampling
   * @param range - The range to sample [min, max]
   * @param samples - Number of samples (default 100)
   * @param graphId - Graph ID to match data2d() calls
   * @returns Array of {x, y} points
   */
  sample2DLine(
    parameter: string,
    range: [number, number],
    samples: number = 100,
    graphId: string
  ): { x: number; y: number }[] {
    return this.sampleWithParameter(
      parameter,
      range,
      samples,
      graphId,
      this.computeAndExtract2D.bind(this)
    );
  }

  /**
   * Sample the semantic function across a parameter range to collect 3D line data.
   * Reads x, y, z values from the dataPoints (from explicit data3d() calls).
   *
   * @param parameter - The variable to vary during sampling
   * @param range - The range to sample [min, max]
   * @param samples - Number of samples (default 100)
   * @param graphId - Graph ID to match graph() calls
   * @returns Array of {x, y, z} points
   */
  sample3DLine(
    parameter: string,
    range: [number, number],
    samples: number = 100,
    graphId: string
  ): { x: number; y: number; z: number }[] {
    return this.sampleWithParameter(
      parameter,
      range,
      samples,
      graphId,
      this.computeAndExtract3D.bind(this)
    );
  }

  /**
   * Sample the semantic function across a 2D parameter grid to collect surface data.
   * Reads x, y, z values from the dataPoints (from explicit data3d() calls).
   *
   * @param parameters - The two variables to vary during sampling [param1, param2]
   * @param ranges - The ranges for each parameter [[min1, max1], [min2, max2]]
   * @param samples - Number of samples per dimension (default 50)
   * @param graphId - Graph ID to match graph() calls
   * @returns Array of {x, y, z} points
   */
  sampleSurface(
    parameters: [string, string],
    ranges: [[number, number], [number, number]],
    samples: number = 50,
    graphId: string
  ): { x: number; y: number; z: number }[] {
    const [param1, param2] = parameters;
    const [[min1, max1], [min2, max2]] = ranges;
    const step1 = (max1 - min1) / samples;
    const step2 = (max2 - min2) / samples;
    const points: { x: number; y: number; z: number }[] = [];
    const baseVariables = this.getVariablesSnapshot();
    for (let i = 0; i <= samples; i++) {
      const value1 = min1 + i * step1;
      for (let j = 0; j <= samples; j++) {
        const value2 = min2 + j * step2;
        baseVariables[param1] = { ...baseVariables[param1], value: value1 };
        baseVariables[param2] = { ...baseVariables[param2], value: value2 };
        const point = this.computeAndExtract3D(baseVariables, graphId);
        if (point) points.push(point);
      }
    }
    return points;
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
