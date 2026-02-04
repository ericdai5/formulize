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
  semantics: function({ vars, data2d }) {
    vars.y = vars.a * vars.x * vars.x + vars.b * vars.x + vars.c;
    data2d("quadratic", {x: vars.x, y: vars.y});
  },

  visualizations: [
    {
      type: "plot2d",
      id: "quadraticPlot",
      title: "Quadratic Function",
      xAxisLabel: "x",
      xAxisVar: "x",
      yAxisLabel: "y",
      yAxisVar: "y",
      xRange: [-5, 5],
      yRange: [-10, 10],
      graphs: [
        {
          type: "line",
          id: "quadratic",
          parameter: "x",
          interaction: ["vertical-drag", "c"]
        },
        {
          type: "point",
          id: "quadratic",
          interaction: ["horizontal-drag", "x"]
        }
      ]
    }
  ]
};`;
