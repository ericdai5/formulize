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
}

// Context object passed to custom visualizations
export interface IContext {
  variables: Record<string, number>; // Current variable values
  updateVariable: (variableName: string, value: number) => void; // Function to update formula variables
  getVariable: (variableName: string) => number; // Function to get current variable value
}
