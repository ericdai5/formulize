const quadraticEquationExample = `const config = {
  formulas: [
    {
      name: "Quadratic Equation",
      function: "y = ax^2 + bx + c",
      expression: "{y} = {a} * {x} * {x} + {b} * {x} + {c}"
    }
  ],
  variables: {
    y: {
      type: "dependent",
      label: "y-value",
      precision: 2
    },
    x: {
      type: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      label: "x"
    },
    a: {
      type: "input",
      value: 1,
      range: [-5, 5],
      step: 0.1,
      label: "Coefficient a"
    },
    b: {
      type: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      label: "Coefficient b"
    },
    c: {
      type: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      label: "Coefficient c"
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
      xVar: "x",
      xRange: [-5, 5],
      yVar: "y",
      yRange: [-10, 10],
      width: 600,
      height: 600
    }
  ]
};

const formula = await Formulize.create(config);`;

export default quadraticEquationExample;
