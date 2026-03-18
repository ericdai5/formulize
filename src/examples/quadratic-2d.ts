export const quadratic2D = `const config = {
  formulas: [
    {
      id: "quadratic-equation",
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
      range: [-5, 5],
      step: 0.1,
      name: "Coefficient a"
    },
    b: {
      input: "drag",
      default: 0,
      range: [-10, 10],
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
    sample("quadratic", {x: vars.x, y: vars.y});
  },

  graph2d: [
    {
      id: "quadraticPlot",
      xAxisLabel: "x",
      xAxisVar: "x",
      yAxisLabel: "y",
      yAxisVar: "y",
      xRange: [-5, 5],
      yRange: [-10, 10],
      lines: [
        {
          sampleId: "quadratic",
          parameter: "x",
          interaction: ["vertical-drag", "c"]
        }
      ],
      points: [
        {
          sampleId: "quadratic",
          interaction: ["horizontal-drag", "x"]
        }
      ]
    }
  ]
};`;
