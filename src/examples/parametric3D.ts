const parametric3DExample = `const config = {
  formulas: [
    {
      name: "x and t",
      function: "x = t",
      expression: "{x} = {t}"
    },
    {
      name: "y and t",
      function: "y = 1 - 2t",
      expression: "{y} = 1 - 2 * {t}"
    },
    {
      name: "z and t",
      function: "z = t",
      expression: "{z} = {t}"
    },
    {
      name: "x + y + z = 1",
      function: "1 = x + y + z",
      expression: "{x} + {y} + {z} = 1"
    },
    {
      name: "x and z",
      function: "x - z = 0",
      expression: "{x} - {z} = 0"
    }
  ],
  variables: {
    x: {
      type: "dependent",
      label: "x-coordinate",
      precision: 1
    },
    y: {
      type: "dependent",
      label: "y-coordinate",
      precision: 1
    },
    z: {
      type: "dependent",
      label: "z-coordinate",
      precision: 1
    },
    t: {
      type: "input",
      value: 0,
      range: [-2, 2],
      step: 0.1,
      label: "Parameter t"
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },

  visualizations: [
    {
      type: "plot3d",
      id: "parametricPlane3D",
      title: "3D Parametric Surfaces",
      xVar: "x",
      xRange: [-10, 10],
      yVar: "y",
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
          formulaName: "x + y + z = 1",
          color: "purple",
          opacity: 0.3,
          showInLegend: true,
          showColorbar: false
        },
        {
          formulaName: "x and z",
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
            surface1: "x + y + z = 1",
            surface2: "x and z"
          },
          color: "yellow",
          width: 4,
          showInLegend: true
        }
      ]
    }
  ]
};

const formula = await Formulize.create(config);`;

export default parametric3DExample;
