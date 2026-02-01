export const parametric3D = `const config = {
  formulas: [
    {
      id: "x-and-t",
      latex: "x = t"
    },
    {
      id: "y-and-t",
      latex: "y = 1 - 2t"
    },
    {
      id: "z-and-t",
      latex: "z = t"
    },
    {
      id: "x-plus-y-plus-z-equals-1",
      latex: "1 = x + y + z"
    },
    {
      id: "x-and-z",
      latex: "x - z = 0"
    }
  ],
  variables: {
    x: {
      name: "x-coordinate",
      precision: 1
    },
    y: {
      name: "y-coordinate",
      precision: 1
    },
    z: {
      name: "z-coordinate",
      precision: 1
    },
    t: {
      input: "drag",
      default: 0,
      range: [-2, 2],
      step: 0.1,
      name: "Parameter t"
    }
  },
  semantics: {
    engine: "symbolic-algebra",
    expressions: {
      "x-and-t": "{x} = {t}",
      "y-and-t": "{y} = 1 - 2 * {t}",
      "z-and-t": "{z} = {t}",
      "x-plus-y-plus-z-equals-1": "{x} + {y} + {z} = 1",
      "x-and-z": "{x} - {z} = 0"
    }
  },

  visualizations: [
    {
      type: "plot3d",
      id: "parametricPlane3D",
      title: "3D Parametric Surfaces",
      xAxis: "x",
      xRange: [-10, 10],
      yAxis: "y",
      yRange: [-10, 10],
      zVar: "z",
      zRange: [-10, 10],
      plotType: "surface",

      showColorbar: true,
      showCurrentPointInLegend: true,
      surfaces: [
        {
          id: "x-plus-y-plus-z-equals-1",
          color: "purple",
          opacity: 0.3,
          showInLegend: true,
          showColorbar: false
        },
        {
          id: "x-and-z",
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
