import { bayesWithCustomVisualization } from "./bayesVisualization";
import { gravitationalPotential } from "./gravitationalPotential";
import { kineticEnergy } from "./kineticEnergy";
import { kineticEnergy3D } from "./kineticEnergy3D";
import { parameterizedPlane } from "./parameterizedPlane";
import { parametric3D } from "./parametric3D";
import { quadraticEquation } from "./quadraticEquation";
import { quadraticEquation3D } from "./quadraticEquation3D";
import { rationalNumbers } from "./rationalNumbers";
import { summationBasic } from "./summationBasic";
import { summationDefault } from "./summationDefault";
import { taylorSeries } from "./taylorSeries";
import { testing } from "./testing";
import { vectorAddition } from "./vectorAddition";
import { lossFunction } from "./lossFunction";

export const examples = {
  kineticEnergy,
  gravitationalPotential,
  kineticEnergy3D,
  quadraticEquation,
  quadraticEquation3D,
  parametric3D,
  rationalNumbers,
  parameterizedPlane,
  testing,
  bayesWithCustomVisualization,
  summationBasic,
  summationDefault,
  taylorSeries,
  vectorAddition,
  lossFunction,
};

export const exampleDisplayNames = {
  kineticEnergy: "Kinetic Energy",
  gravitationalPotential: "Gravitational Potential",
  kineticEnergy3D: "Kinetic Energy 3D",
  quadraticEquation: "Quadratic Equation",
  quadraticEquation3D: "Quadratic Equation 3D",
  parametric3D: "Parametric 3D",
  rationalNumbers: "Rational Numbers",
  parameterizedPlane: "Parameterized Plane",
  testing: "Testing",
  bayesWithCustomVisualization: "Bayes Custom Visualization",
  summationBasic: "Summation Basic",
  summationDefault: "Summation Default",
  taylorSeries: "Taylor Series",
  vectorAddition: "Vector Addition",
  lossFunction: "Loss Function with Regularization",
} as const;

export default examples;
