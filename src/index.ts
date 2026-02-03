// Import all required styles - these will be bundled into the output CSS
// Includes Tailwind CSS and custom styles
import "@xyflow/react/dist/style.css";

import "./index.css";

// React Flow styles

// Export main Formulize API
export { default as Formulize } from "./formulize";
export type { FormulizeConfig, FormulizeInstance } from "./formulize";

// Export new component-based API
export {
  Formula,
  InlineFormula,
  InlineVariable,
  VisualizationComponent,
  FormulizeProvider,
  EmbeddedFormula,
  InterpreterControl,
} from "./core";
export type { InterpreterControlProps } from "./core";
export { useFormulize } from "./core/hooks";

// Export step function for manual computation breakpoints
export { step } from "./engine/manual/controller";

// Export computation API - factory function and type for scoped stores
export { createComputationStore, ComputationStore } from "./store/computation";

// Export execution store for interpreter state management - factory function and type for scoped stores
export { createExecutionStore, ExecutionStore } from "./store/execution";

// Export custom visualization registration functions
export {
  register,
  unRegister,
  getAllRegistered,
  getRegistered,
  isRegistered,
} from "./visualizations/custom/registry";

// Export built-in custom visualizations
export {
  BayesProbabilityChart,
  registerBuiltInComponents,
} from "./visualizations/custom/components";

// Export general programmatic generation utilities
export {
  Formula as FormulaGenerator,
  Variable,
  Semantics,
  mergeVariables,
  mergeFormulas,
} from "./util/generators";
export type { LoopRange, LoopSpec, LoopContext } from "./util/generators";

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
export type {
  IPlot2D,
  IStepPoint,
  I2DConfig,
  I2DLine,
  I2DPoint,
} from "./types/plot2d";
export type { IInterpreterStep } from "./types/step";
export type { IPlot3D } from "./types/plot3d";
export type { ICustom, IContext } from "./types/custom";
export type { IControls } from "./types/control";
