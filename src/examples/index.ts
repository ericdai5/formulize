import { average } from "./average";
import { task2instruction } from "./task-2-instruction";
import { bayesWithCustomVisualization } from "./bayes-visualization";
import { fittsLaw } from "./fitts-law";
import { gravitationalPotential } from "./gravitational-potential";
import { waveEquationSVG } from "./js-generated-svg";
import { kinetic2D } from "./kinetic-2d";
import { kinetic3D } from "./kinetic-3d";
import { lossFunction } from "./loss-function";
import { matrixMultiplication } from "./matrix-multiplication";
import { parameterizedPlane } from "./parameterized-plane";
import { parametric3D } from "./parametric-3d";
import { task2training } from "./task-2-training";
import { quadratic2D } from "./quadratic-2d";
import { quadratic3D } from "./quadratic-3d";
import { setOperations } from "./set-operations";
import { sinTheta } from "./sin-theta";
import { summationBasic } from "./summation-basic";
import { svgIntegration } from "./svg-integration";
import { svgKineticEnergy2D } from "./svg-labels";
import { vectorAddition } from "./vector-addition";

export const examples = {
  average,
  task2instruction,
  kinetic2D,
  kinetic3D,
  task2training,
  quadratic2D,
  quadratic3D,
  sinTheta,
  gravitationalPotential,
  parametric3D,
  parameterizedPlane,
  bayesWithCustomVisualization,
  summationBasic,
  svgIntegration,
  svgKineticEnergy2D,
  waveEquationSVG,
  vectorAddition,
  matrixMultiplication,
  lossFunction,
  setOperations,
  fittsLaw,
};

export const exampleDisplayNames = {
  average: "Average (Mean)",
  task2instruction: "Task 2 Instruction",
  kinetic2D: "Kinetic Energy 2D",
  kinetic3D: "Kinetic Energy 3D",
  gravitationalPotential: "Gravitational Potential",
  task2training: "Task 2 Training",
  quadratic2D: "Quadratic Equation 2D",
  quadratic3D: "Quadratic Equation 3D",
  sinTheta: "Sine Function",
  parametric3D: "Parametric 3D",
  parameterizedPlane: "Parameterized Plane",
  bayesWithCustomVisualization: "Bayes Custom Visualization",
  summationBasic: "Summation Basic",
  svgIntegration: "SVG Icons in Formulas",
  svgKineticEnergy2D: "Kinetic Energy 2D with SVG",
  waveEquationSVG: "Wave Equation",
  vectorAddition: "Vector Addition",
  matrixMultiplication: "Matrix Multiplication 3x3",
  lossFunction: "Loss Function with Regularization",
  setOperations: "Set Operations (Union & Intersection)",
  fittsLaw: "Fitts' Law",
} as const;

export default examples;
