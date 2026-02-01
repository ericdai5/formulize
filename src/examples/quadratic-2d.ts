export const quadratic2D = `const config = {
  formulas: [
    {
      id: "quadratic-equation",
      latex: "y = ax^2 + bx + c"
    }
  ],
  variables: {
    y: {
      role: "computed",
      name: "y-value",
      precision: 2
    },
    x: {
      role: "input",
      default: 0,
      range: [-10, 10],
      step: 0.1,
      name: "x"
    },
    a: {
      role: "input",
      default: 1,
      range: [-5, 5],
      step: 0.1,
      name: "Coefficient a"
    },
    b: {
      role: "input",
      default: 0,
      range: [-10, 10],
      step: 0.1,
      name: "Coefficient b"
    },
    c: {
      role: "input",
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
