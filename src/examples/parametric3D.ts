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
      precision: 2
    },
    y: {
      type: "dependent",
      label: "y-coordinate",
      precision: 2
    },
    z: {
      type: "dependent",
      label: "z-coordinate",
      precision: 2
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
      config: {
        title: "3D Parametric Surfaces: x + y + z = h and x - z = 0",
        xAxis: {
          variable: "x",
          label: "x = t",
          min: -2,
          max: 2
        },
        yAxis: {
          variable: "y",
          label: "y = 1 - 2t",
          min: -4,
          max: 5
        },
        zAxis: {
          variable: "z",
          label: "z = t",
          min: -2,
          max: 2
        },
        plotType: "surface",
        width: 600,
        height: 600,
        surfaces: [
          {
            formulaName: "h and t",
            color: "Viridis",
            opacity: 0.7,
            showInLegend: true
          },
          {
            formulaName: "x and z",
            color: "Plasma",
            opacity: 0.6,
            showInLegend: true
          }
        ]
      }
    }
  ]
};

const formula = await Formulize.create(config);`;

export default parametric3DExample;
