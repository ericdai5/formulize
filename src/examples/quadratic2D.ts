export const quadratic2D = `const config = {
  formulas: [
    {
      id: "quadratic-equation",
      latex: "y = ax^2 + bx + c",
      expression: "{y} = {a} * {x} * {x} + {b} * {x} + {c}"
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
      value: 0,
      range: [-10, 10],
      step: 0.1,
      name: "x"
    },
    a: {
      role: "input",
      value: 1,
      range: [-5, 5],
      step: 0.1,
      name: "Coefficient a"
    },
    b: {
      role: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      name: "Coefficient b"
    },
    c: {
      role: "input",
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
      title: "Quadratic Function",
      xAxis: "x",
      xRange: [-5, 5],
      yAxis: "y",
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
