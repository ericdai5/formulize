// Import all required styles - these will be bundled into the output CSS
import "./index.css"; // Includes Tailwind CSS and custom styles
import "@xyflow/react/dist/style.css"; // React Flow styles

// Export main Formulize API
export { default as Formulize } from "./formulize";
export type { FormulizeConfig, FormulizeInstance } from "./formulize";

// Export new component-based API
export { FormulaComponent } from "./components/FormulaComponent";
export { VisualizationComponent } from "./components/VisualizationComponent";
export { FormulizeProvider } from "./components/FormulizeProvider";
export { useFormulize } from "./components/useFormulize";

// Export computation API
export { computationStore } from "./store/computation";

// Export custom visualization registration functions
export {
  register,
  unRegister,
  getAllRegistered,
  getRegistered,
  isRegistered,
} from "./visualizations/custom/registry";

// Export types
export type { IComputation } from "./types/computation";
export type { IEnvironment } from "./types/environment";
export type { IFormula } from "./types/formula";
export type { IVariable, IValue } from "./types/variable";
export type { IVisualization } from "./types/visualization";
export type { IPlot2D } from "./types/plot2d";
export type { IPlot3D } from "./types/plot3d";
export type { ICustom, IContext } from "./types/custom";
