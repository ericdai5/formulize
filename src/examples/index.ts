import { bayesWithCustomVisualization } from "./bayesVisualization";
import { gravitationalPotential } from "./gravitationalPotential";
import { kinetic2D } from "./kinetic2D";
import { kinetic3D } from "./kinetic3D";
import { lossFunction } from "./lossFunction";
import { parameterizedPlane } from "./parameterizedPlane";
import { parametric3D } from "./parametric3D";
import { quadratic2D } from "./quadratic2D";
import { quadratic3D } from "./quadratic3D";
import { summationBasic } from "./summationBasic";
import { vectorAddition } from "./vectorAddition";

export const examples = {
  kinetic2D,
  kinetic3D,
  quadratic2D,
  quadratic3D,
  gravitationalPotential,
  parametric3D,
  parameterizedPlane,
  bayesWithCustomVisualization,
  summationBasic,
  vectorAddition,
  lossFunction,
};

export const exampleDisplayNames = {
  kinetic2D: "Kinetic Energy 2D",
  kinetic3D: "Kinetic Energy 3D",
  gravitationalPotential: "Gravitational Potential",
  quadratic2D: "Quadratic Equation 2D",
  quadratic3D: "Quadratic Equation 3D",
  parametric3D: "Parametric 3D",
  parameterizedPlane: "Parameterized Plane",
  bayesWithCustomVisualization: "Bayes Custom Visualization",
  summationBasic: "Summation Basic",
  vectorAddition: "Vector Addition",
  lossFunction: "Loss Function with Regularization",
} as const;

export default examples;
