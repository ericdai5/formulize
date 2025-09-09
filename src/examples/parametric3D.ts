export const parametric3D = `const config = {
  formulas: [
    {
      formulaId: "x-and-t",
      latex: "x = t",
      expression: "{x} = {t}"
    },
    {
      formulaId: "y-and-t",
      latex: "y = 1 - 2t",
      expression: "{y} = 1 - 2 * {t}"
    },
    {
      formulaId: "z-and-t",
      latex: "z = t",
      expression: "{z} = {t}"
    },
    {
      formulaId: "x-plus-y-plus-z-equals-1",
      latex: "1 = x + y + z",
      expression: "{x} + {y} + {z} = 1"
    },
    {
      formulaId: "x-and-z",
      latex: "x - z = 0",
      expression: "{x} - {z} = 0"
    }
  ],
  variables: {
    x: {
      type: "dependent",
      name: "x-coordinate",
      precision: 1
    },
    y: {
      type: "dependent",
      name: "y-coordinate",
      precision: 1
    },
    z: {
      type: "dependent",
      name: "z-coordinate",
      precision: 1
    },
    t: {
      type: "input",
      value: 0,
      range: [-2, 2],
      step: 0.1,
      name: "Parameter t"
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },

  visualizations: [
    {
      type: "plot3d",
      id: "parametricPlane3D",
      formulaId: "x-plus-y-plus-z-equals-1",
      title: "3D Parametric Surfaces",
      xAxisVar: "x",
      xRange: [-10, 10],
      yAxisVar: "y",
      yRange: [-10, 10],
      zVar: "z",
      zRange: [-10, 10],
      plotType: "surface",
      width: 600,
      height: 600,
      showColorbar: true,
      showCurrentPointInLegend: true,
      surfaces: [
        {
          formulaId: "x-plus-y-plus-z-equals-1",
          color: "purple",
          opacity: 0.3,
          showInLegend: true,
          showColorbar: false
        },
        {
          formulaId: "x-and-z",
          color: "green",
          opacity: 0.3,
          showInLegend: true,
          showColorbar: false
        }
      ],
      lines: [
        {
          name: "Intersection Line",
          surfaceIntersection: {
            surface1: "x-plus-y-plus-z-equals-1",
            surface2: "x-and-z"
          },
          color: "yellow",
          width: 4,
          showInLegend: true
        }
      ]
    }
  ]
};`;
