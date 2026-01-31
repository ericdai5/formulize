export const quadratic3D = `const config = {
  formulas: [
    {
      id: "quadratic-equation-3d",
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
      range: [-5, 5],
      step: 0.1,
      name: "x"
    },
    a: {
      role: "input",
      default: 1,
      range: [-2, 2],
      step: 0.1,
      name: "Coefficient a"
    },
    b: {
      role: "input",
      default: 0,
      range: [-5, 5],
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
    engine: "symbolic-algebra",
    expressions: {
      "quadratic-equation-3d": "{y} = {a} * {x} * {x} + {b} * {x} + {c}"
    }
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
