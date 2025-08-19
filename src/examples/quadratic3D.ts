export const quadratic3D = `const config = {
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
      range: [-5, 5],
      step: 0.1,
      label: "x"
    },
    a: {
      type: "input",
      value: 1,
      range: [-2, 2],
      step: 0.1,
      label: "Coefficient a"
    },
    b: {
      type: "input",
      value: 0,
      range: [-5, 5],
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
      type: "plot3d",
      id: "quadratic3DSurface",
      title: "3D Quadratic Surface: y = ax² + bx + c",
      xVar: "x",
      xRange: [-5, 5],
      yVar: "c",
      yRange: [-5, 5],
      zVar: "y",
      zRange: [-20, 40],
      plotType: "surface",
      width: 600,
      height: 600,
      surfaces: [
        {
          formulaName: "Quadratic Equation",
          color: "Viridis",
          opacity: 0.7,
          showInLegend: true
        }
      ]
    }
  ]
};

const formula = await Formulize.create(config);`;
