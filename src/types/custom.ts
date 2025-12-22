// code: Inline JavaScript code as string
// component: Reference to a pre-defined component
// renderFunction: Custom render function
// dependencies: Libraries/dependencies needed
// styles: CSS styles for the container

export interface ICustom {
  type: "custom";
  id?: string;
  variables: string[];
  component?: string;
  styles?: Record<string, string>;
  update?: {
    onVariableChange?: boolean; // Update on variable change
  };
  /** Custom configuration passed to the component */
  config?: Record<string, unknown>;
}

// Context object passed to custom visualizations
export interface IContext {
  variables: Record<string, number>; // Current variable values
  updateVariable: (variableName: string, value: number) => void; // Function to update formula variables
  getVariable: (variableName: string) => number; // Function to get current variable value
  /** Set hover state for a visualization node (triggers formula highlighting) */
  setNodeHover?: (nodeId: string, isHovered: boolean) => void;
  /** Get current hover state for a node */
  getNodeHover?: (nodeId: string) => boolean;
  /** Set hover state for a formula (for visualization to react to) */
  setFormulaHover?: (formulaId: string, isHovered: boolean) => void;
  /** Get current hover state for a formula */
  getFormulaHover?: (formulaId: string) => boolean;
  /** Subscribe to formula hover changes */
  onFormulaHoverChange?: (callback: (formulaId: string, isHovered: boolean) => void) => () => void;
  /** Custom configuration from the visualization config */
  config?: Record<string, unknown>;
}
