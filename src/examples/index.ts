import { bayesWithCustomVisualization } from "./bayesVisualization";
import { fittsLaw } from "./fittsLaw";
import { gravitationalPotential } from "./gravitationalPotential";
import { kinetic2D } from "./kinetic2D";
import { kinetic3D } from "./kinetic3D";
import { lossFunction } from "./lossFunction";
import { matrixMultiplication } from "./matrixMultiplication";
import { parameterizedPlane } from "./parameterizedPlane";
import { parametric3D } from "./parametric3D";
import { quadratic2D } from "./quadratic2D";
import { quadratic3D } from "./quadratic3D";
import { setOperations } from "./setOperations";
import { sinTheta } from "./sinTheta";
import { summationBasic } from "./summationBasic";
import { svgIntegration } from "./svg-integration";
import { svgKineticEnergy2D } from "./svgLabels";
import { vectorAddition } from "./vectorAddition";
import { waveEquationSVG } from "./jsGeneratedSVG";

export const examples = {
  kinetic2D,
  kinetic3D,
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
  kinetic2D: "Kinetic Energy 2D",
  kinetic3D: "Kinetic Energy 3D",
  gravitationalPotential: "Gravitational Potential",
  quadratic2D: "Quadratic Equation 2D",
  quadratic3D: "Quadratic Equation 3D",
  sinTheta: "Sine Function",
  parametric3D: "Parametric 3D",
  parameterizedPlane: "Parameterized Plane",
  bayesWithCustomVisualization: "Bayes Custom Visualization",
  summationBasic: "Summation Basic",
  svgIntegration: "SVG Icons in Formulas",
  svgKineticEnergy2D: "Kinetic Energy 2D with SVG",
  waveEquationSVG: "Wave Equation with JS-Generated SVG",
  vectorAddition: "Vector Addition",
  matrixMultiplication: "Matrix Multiplication 3x3",
  lossFunction: "Loss Function with Regularization",
  setOperations: "Set Operations (Union & Intersection)",
  fittsLaw: "Fitts' Law",
} as const;

export default examples;
