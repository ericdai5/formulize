import { average } from "./average";
import { averageStepping } from "./average-stepping";
import { bayesWithCustomVisualization } from "./bayes-visualization";
import { fittsLaw } from "./fitts-law";
import { gradientDescent } from "./gradient-descent";
import { gravitationalForce } from "./gravitational-force";
import { gravitationalPotential } from "./gravitational-potential";
import { waveEquationSVG } from "./js-generated-svg";
import { kinetic2D } from "./kinetic-2d";
import { kineticEnergy } from "./kinetic-energy";
import { kinetic3D } from "./kinetic-3d";
import { lossFunction } from "./loss-function";
import { matrixMultiplication } from "./matrix-multiplication";
import { simpleLoss } from "./simple-loss";
import { parameterizedPlane } from "./parameterized-plane";
import { parametric3D } from "./parametric-3d";
import { quadratic2D } from "./quadratic-2d";
import { quadratic3D } from "./quadratic-3d";
import { setOperations } from "./set-operations";
import { sinTheta } from "./sin-theta";
import { summationBasic } from "./summation-basic";
import { svgIntegration } from "./svg-integration";
import { svgKineticEnergy2D } from "./svg-labels";
import { task2instruction } from "./task-2-instruction";
import { task2training } from "./task-2-training";
import { vectorAddition } from "./vector-addition";

export const examples = {
  kinetic2D,
  kineticEnergy,
  kinetic3D,
  quadratic2D,
  quadratic3D,
  sinTheta,
  gravitationalForce,
  gravitationalPotential,
  parametric3D,
  parameterizedPlane,
  bayesWithCustomVisualization,
  average,
  averageStepping,
  summationBasic,
  svgIntegration,
  svgKineticEnergy2D,
  waveEquationSVG,
  vectorAddition,
  matrixMultiplication,
  lossFunction,
  simpleLoss,
  setOperations,
  fittsLaw,
  gradientDescent,
  task2training,
  task2instruction,
};

export const exampleDisplayNames = {
  kinetic2D: "Kinetic Energy 2D",
  kineticEnergy: "Kinetic Energy",
  kinetic3D: "Kinetic Energy 3D",
  gravitationalForce: "Gravitational Force",
  gravitationalPotential: "Potential Energy 2D",
  quadratic2D: "Quadratic Equation 2D",
  quadratic3D: "Quadratic Equation 3D",
  sinTheta: "Sine Function 2D",
  parametric3D: "Parametric 3D",
  parameterizedPlane: "Parameterized Plane 3D",
  bayesWithCustomVisualization: "Bayes Theorem",
  average: "Average Stepping",
  averageStepping: "Average with Stepping",
  summationBasic: "Summation Stepping",
  svgIntegration: "SVG Radioactive Decay",
  svgKineticEnergy2D: "SVG Kinetic Energy",
  waveEquationSVG: "SVG Wave Equation",
  vectorAddition: "Vector Addition 2D",
  matrixMultiplication: "Matrix Multiplication 3x3",
  lossFunction: "Loss Function Stepping",
  simpleLoss: "Simple Loss Function",
  setOperations: "Set Operations",
  fittsLaw: "Fitts' Law 2D",
  gradientDescent: "Gradient Descent Stepping",
  task2training: "Task 2 Training",
  task2instruction: "Task 2 Instruction",
} as const;

export default examples;
