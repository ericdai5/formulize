// Export main Formulize API
export { default as Formulize } from "./Formulize";
export type { FormulizeConfig, FormulizeInstance } from "./Formulize";

// Export computation API
export { computationStore } from "../store/computation";

// Export custom visualization registration functions
export {
  register,
  unRegister,
  getAllRegistered,
  getRegistered,
  isRegistered,
} from "../visualizations/custom/registry";

// Export types
export type { IComputation } from "../types/computation";
export type { IEnvironment } from "../types/environment";
export type { IFormula } from "../types/formula";
export type { IVariable } from "../types/variable";
export type { IVisualization } from "../types/visualization";
export type { IPlot2D } from "../types/plot2d";
export type { IPlot3D } from "../types/plot3d";
export type { ICustom, IContext } from "../types/custom";
