const parametric3DExample = `
const config = {
  formula: {
    expressions: [
      "x = t",
      "y = 1 - 2 * t",
      "z = t"
    ],
    variables: {
      x: {
        type: "dependent",
        value: 0,
        range: [-2, 2],
        step: 0.1,
        label: "x-coordinate",
        precision: 2
      },
      y: {
        type: "dependent",
        value: 0,
        range: [-2, 2],
        step: 0.1,
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
      engine: "symbolic-algebra",
      expressions: [
        "{x} = {t}",
        "{y} = 1 - 2 * {t}",
        "{z} = {t}"
      ]
    }
  },
  
  visualizations: [
    {
      type: "plot3d",
      id: "parametricPlane3D",
      config: {
        title: "3D Parametric Line: x = t, y = 1 - 2t, z = t",
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
        plotType: "line",
        width: 600,
        height: 600
      }
    }
  ]
};

const formula = await Formulize.create(config);`;

export default parametric3DExample;
