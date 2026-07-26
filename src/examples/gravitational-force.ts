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
      precision: 2,
    },
    G: {
      default: 6.674e-11,
      name: "Gravitational Constant",
      sigFigs: 4,
    },
    m_1: {
      default: 5.972e24,
      name: "Mass of Earth",
      sigFigs: 4,
    },
    m_2: {
      default: 80,
      range: [1, 200],
      input: "drag",
      name: "Mass of Person",
      precision: 0,
    },
    r: {
      default: 6.371e6,
      name: "Earth's radius",
      sigFigs: 4,
    },
  },
  stepping: true,
  semantics: function({ vars, step, latex }) {
    var G = vars.G;
    var m1 = vars.m_1;
    var m2 = vars.m_2;
    var r = vars.r;
    var product = m1 * m2;
    step({
      labels: {
        "m_1": m1,
        "m_2": m2,
        "m_1 m_2": "Multiply the two masses = " + latex(product).sigfigs(4),
      },
    });
    var squared = r * r;
    step({
      description: "Square the distance = " + latex(squared).sigfigs(4),
      labels: {
        "r": r,
        "r^2": null,
      },
    });
    var fraction = product / squared;
    var force = G * fraction;
    vars["\\\\vec{F}"] = force;
    step({
      description:
        "Multiply by fraction $G$ to get force",
      labels: {
        "\\\\vec{F}": latex(vars["\\\\vec{F}"]).precision(2),
        "G": vars.G,
        "\\\\frac{m_1 m_2}{r^2}": latex(fraction).sigfigs(4),
      },
    });
  },
};`;
