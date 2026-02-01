export const quadratic3D = `const config = {
  formulas: [
    {
      id: "quadratic-equation-3d",
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
      range: [-2, 2],
      step: 0.1,
      name: "Coefficient a"
    },
    b: {
      input: "drag",
      default: 0,
      range: [-5, 5],
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
    manual: function(vars) {
      vars.y = vars.a * vars.x * vars.x + vars.b * vars.x + vars.c;
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
