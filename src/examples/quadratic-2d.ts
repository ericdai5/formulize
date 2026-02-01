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
      range: [-10, 10],
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
  semantics: {
    expressions: {
      "quadratic-equation": "{y} = {a} * {x} * {x} + {b} * {x} + {c}"
    }
  },

  visualizations: [
    {
      type: "plot2d",
      id: "quadraticPlot",
      title: "Quadratic Function",
      xAxis: "x",
      xRange: [-5, 5],
      yAxis: "y",
      yRange: [-10, 10],

      lines: [
        {
          color: "#ef4444",
          name: "Quadratic",
          showInLegend: true
        }
      ]
    }
  ]
};`;
