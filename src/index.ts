// Import all required styles - these will be bundled into the output CSS
// Includes Tailwind CSS and custom styles
import "@xyflow/react/dist/style.css";

import "./index.css";

// React Flow styles

// Export main Store API
export { default as Store } from "./formulize";
export type { Config, Instance } from "./formulize";

// Export new component-based API
export {
  Formula,
  InlineFormula,
  InlineVariable,
  VisualizationComponent,
  Provider,
  EmbeddedFormula,
  StepControl,
} from "./core";
export type { StepControlProps } from "./core";
export { useStore } from "./core/hooks";

// Export computation API - factory function and type for scoped stores
// Step functionality is now integrated into ComputationStore
export { createComputationStore, ComputationStore } from "./store/computation";

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
  mergeVariables,
  mergeFormulas,
} from "./util/generators";
export type { LoopRange, LoopSpec, LoopContext } from "./util/generators";

// Export types
export type { ISemantics, ISemanticsContext } from "./types/computation";
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
  I2DConfig,
  I2DLine,
  I2DPoint,
} from "./types/plot2d";
export type { ICollectedStep, IView, IStepInput } from "./types/step";
export type { IPlot3D } from "./types/plot3d";
export type { ICustom, IContext } from "./types/custom";
export type { IControls } from "./types/control";
