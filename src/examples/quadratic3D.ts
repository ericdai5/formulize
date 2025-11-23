export const quadratic3D = `const config = {
  formulas: [
    {
      id: "quadratic-equation-3d",
      latex: "y = ax^2 + bx + c",
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
      range: [-5, 5],
      step: 0.1,
      name: "x"
    },
    a: {
      type: "input",
      value: 1,
      range: [-2, 2],
      step: 0.1,
      name: "Coefficient a"
    },
    b: {
      type: "input",
      value: 0,
      range: [-5, 5],
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
      type: "plot3d",
      id: "quadratic3DSurface",
      title: "3D Quadratic Surface: y = ax² + bx + c",
      xAxis: "x",
      xRange: [-5, 5],
      yAxis: "c",
      yRange: [-5, 5],
      zVar: "y",
      zRange: [-20, 40],
      plotType: "surface",
      width: 600,
      height: 600,
      surfaces: [
        {
          id: "quadratic-equation-3d",
          color: "Viridis",
          opacity: 0.7,
          showInLegend: true
        }
      ]
    }
  ]
};`;
