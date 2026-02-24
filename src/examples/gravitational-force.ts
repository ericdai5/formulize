export const gravitationalForce = `const config = {
  formulas: [
    {
      id: "gravity",
      latex: "\\\\vec{F} = G \\\\frac{m_1 m_2}{r^2}",
    },
  ],
  variables: {
    "\\\\vec{F}": {
      default: 0,
      name: "Gravitational Force",
    },
    G: {
      default: 6.674e-11,
      name: "Gravitational Constant",
    },
    m_1: {
      default: 5.972e24,
      name: "Mass of Earth",
    },
    m_2: {
      default: 80,
      name: "Mass of Person",
    },
    r: {
      default: 6.371e6,
      name: "Distance (Earth's radius)",
    },
  },
  stepping: true,
  semantics: function({ vars, step }) {
    var G = vars.G;
    var m1 = vars.m_1;
    var m2 = vars.m_2;
    var r = vars.r;
    var massProduct = m1 * m2;
    step({
      labels: {
        "m_1": m1,
        "m_2": m2,
        "m_1 m_2": "Multiply the two masses: $m_1 \\\\cdot m_2 = " +
        massProduct.toExponential(2) +
        "$",
      },
    });
    var rSquared = r * r;
    step({
      description: "Square the distance: $r^2 = " + rSquared.toExponential(2) + "$",
      labels: {
        "r": r,
        "r^2": rSquared.toExponential(2),
      },
    });
    var fraction = massProduct / rSquared;
    step({
      description:
        "Divide masses by distance squared: $\\\\frac{m_1 m_2}{r^2} = " +
        fraction.toExponential(2) +
        "$",
      labels: {
        "\\\\frac{m_1 m_2}{r^2}": fraction.toExponential(2),
      },
    });

    var force = G * fraction;
    step({
      description:
        "Multiply by $G$ to get force: $\\\\vec{F} = " + force.toFixed(1) + "$ N",
      labels: {
        "\\\\vec{F}": force.toFixed(1) + " N",
      },
    });

    vars["\\\\vec{F}"] = force;
  },
  fontSize: 1.5,
};`;
