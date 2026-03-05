export const quadratic3D = `const config = {
  formulas: [
    {
      id: "quadratic-equation-3d",
      latex: "y = ax^2 + bx + c"
    }
  ],
  variables: {
    y: {
      name: "y-value",
      precision: 2
    },
    x: {
      input: "drag",
      default: 0,
      range: [-5, 5],
      step: 0.1,
      name: "x"
    },
    a: {
      input: "drag",
      default: 1,
      range: [-2, 2],
      step: 0.1,
      name: "Coefficient a"
    },
    b: {
      input: "drag",
      default: 0,
      range: [-5, 5],
      step: 0.1,
      name: "Coefficient b"
    },
    c: {
      input: "drag",
      default: 0,
      range: [-10, 10],
      step: 0.1,
      name: "Coefficient c"
    }
  },
  semantics: function({ vars, sample }) {
    vars.y = vars.a * vars.x * vars.x + vars.b * vars.x + vars.c;
    sample("quadratic", {x: vars.x, y: vars.c, z: vars.y});
  },

  graph3d: [
    {
      id: "quadratic3DSurface",
      xRange: [-5, 5],
      yRange: [-5, 5],
      zRange: [-20, 40],
      surfaces: [
        {
          sampleId: "quadratic",
          name: "Quadratic Surface",
          parameters: ["x", "c"],
        }
      ],
      points: [
        {
          name: "Current Point",
          sampleId: "quadratic",
        }
      ]
    }
  ]
};`;
