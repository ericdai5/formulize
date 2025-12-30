// Import all required styles - these will be bundled into the output CSS
// Includes Tailwind CSS and custom styles
import "@xyflow/react/dist/style.css";

import "./index.css";

// React Flow styles

// Export main Formulize API
export { default as Formulize } from "./formulize";
export type { FormulizeConfig, FormulizeInstance } from "./formulize";

// Export new component-based API
export { FormulaComponent } from "./components/FormulaComponent";
export { InlineFormula } from "./components/InlineFormula";
export { InlineVariable } from "./components/InlineVariable";
export { VisualizationComponent } from "./components/VisualizationComponent";
export { FormulizeProvider } from "./components/FormulizeProvider";
export { useFormulize } from "./components/useFormulize";

// Export interpreter controls for step-through debugging
export { InterpreterControl } from "./components/InterpreterControl";
export type { InterpreterControlProps } from "./components/InterpreterControl";

// Export view function for manual computation breakpoints
export { view } from "./engine/manual/controller";

// Export computation API
export { computationStore } from "./store/computation";

// Export execution store for interpreter state management
export { executionStore } from "./store/execution";

// Export custom visualization registration functions
export {
  register,
  unRegister,
  getAllRegistered,
  getRegistered,
  isRegistered,
} from "./visualizations/custom/registry";

// Export types
export type { ISemantics } from "./types/computation";
export type { IEnvironment } from "./types/environment";
export type { IFormula } from "./types/formula";
export type {
  IVariable,
  IValue,
  IVariableInput,
  IVariableUserInput,
  IVariablesUserInput,
} from "./types/variable";
export type { IVisualization } from "./types/visualization";
export type { IPlot2D } from "./types/plot2d";
export type { IPlot3D } from "./types/plot3d";
export type { ICustom, IContext } from "./types/custom";
export type { IControls } from "./types/control";
