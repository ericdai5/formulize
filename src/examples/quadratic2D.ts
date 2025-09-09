export const quadratic2D = `const config = {
  formulas: [
    {
      formulaId: "quadratic-equation",
      function: "y = ax^2 + bx + c",
      expression: "{y} = {a} * {x} * {x} + {b} * {x} + {c}"
    }
  ],
  variables: {
    y: {
      type: "dependent",
      name: "y-value",
      precision: 2
    },
    x: {
      type: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      name: "x"
    },
    a: {
      type: "input",
      value: 1,
      range: [-5, 5],
      step: 0.1,
      name: "Coefficient a"
    },
    b: {
      type: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      name: "Coefficient b"
    },
    c: {
      type: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      name: "Coefficient c"
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },
  
  visualizations: [
    {
      type: "plot2d",
      id: "quadraticPlot",
      formulaId: "quadratic-equation",
      title: "Quadratic Function",
      xVar: "x",
      xRange: [-5, 5],
      yVar: "y",
      yRange: [-10, 10],
      width: 600,
      height: 600,
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
