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
      name: "h and t",
      function: "h = x + y + z",
      expression: "{x} + {y} + {z} = {h}"
    },
    {
      name: "x and z",
      function: "x - z = 0",
      expression: "{x} - {z} = 0"
    }
  ],
  variables: {
    h: {
      type: "dependent",
      label: "h-coordinate",
      precision: 2
    },
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
      title: "3D Parametric Surfaces: x + y + z = h and x - z = 0",
      xVar: "x",
      xRange: [-10, 10],
      yVar: "y",
      yRange: [-10, 10],
      zVar: "z",
      zRange: [-10, 10],
      plotType: "surface",
      width: 600,
      height: 600,
      surfaces: [
        {
          formulaName: "h and t",
          color: "purple",
          opacity: 0.3,
          showInLegend: true
        },
        {
          formulaName: "x and z",
          color: "green",
          opacity: 0.3,
          showInLegend: true
        }
      ],
      lines: [
        {
          name: "Intersection Line",
          surfaceIntersection: {
            surface1: "h and t",
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
