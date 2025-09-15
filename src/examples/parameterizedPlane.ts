export const parameterizedPlane = `const config = {
  formulas: [
    {
      formulaId: "x-parameterization",
      latex: "x = 1 - t - w",
      expression: "{x} = 1 - {t} - {w}"
    },
    {
      formulaId: "y-parameterization",
      latex: "y = t",
      expression: "{y} = {t}"
    },
    {
      formulaId: "z-parameterization",
      latex: "z = w",
      expression: "{z} = {w}"
    },
    {
      formulaId: "plane-equation",
      latex: "x + y + z = 1",
      expression: "{x} + {y} + {z} = 1"
    }
  ],
  variables: {
    x: {
      type: "dependent",
      name: "x-coordinate",
      precision: 2
    },
    y: {
      type: "dependent",
      name: "y-coordinate",
      precision: 2
    },
    z: {
      type: "dependent",
      name: "z-coordinate",
      precision: 2
    },
    t: {
      type: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      name: "Parameter t"
    },
    w: {
      type: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      name: "Parameter w"
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },

  controls: [
    {
      id: "tSlider",
      type: "slider",
      variable: "t",
      orientation: "horizontal"
    },
    {
      id: "wSlider",
      type: "slider",
      variable: "w",
      orientation: "horizontal"
    }
  ],

  visualizations: [
    {
      type: "plot3d",
      id: "parameterizedPlane3D",
      title: "Parameterized Plane: x + y + z = 1",
      xAxisVar: "x",
      xRange: [-15, 15],
      yAxisVar: "y",
      yRange: [-15, 15],
      zVar: "z",
      zRange: [-15, 15],
      plotType: "surface",
      width: 600,
      height: 600,
      showColorbar: true,
      showCurrentPointInLegend: true,
      surfaces: [
        {
          formulaId: "plane-equation",
          color: "rgba(128, 0, 128, 0.6)",
          opacity: 0.6,
          showInLegend: true,
          showColorbar: false
        }
      ],
      points: [
        {
          name: "Current Point (x, y, z)",
          x: "x",
          y: "y", 
          z: "z",
          color: "red",
          size: 8,
          showInLegend: true
        }
      ]
    },
  ]
};`;
