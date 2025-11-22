export const kinetic3D = `const config = {
  formulas: [
    {
      id: "kinetic-energy-3d",
      latex: "K = \\\\frac{1}{2}mv^2",
      expression: "{K} = 0.5 * {m} * {v} * {v}"
    }
  ],
  variables: {
    K: {
      type: "dependent",
      units: "J",
      name: "Kinetic Energy",
      precision: 2
    },
    m: {
      type: "input",
      value: 2,
      range: [0.5, 5],
      units: "kg",
      name: "Mass"
    },
    v: {
      type: "input",
      value: 3,
      range: [0.5, 10],
      units: "m/s",
      name: "Velocity"
    }
  },
  computation: {
    engine: "symbolic-algebra",
  },
  
  visualizations: [
    {
      type: "plot3d",
      id: "energy3DPlot",
      id: "kinetic-energy-3d",
      title: "3D Kinetic Energy Surface",
      xAxis: "m",
      xRange: [0.5, 5],
      yAxis: "v",
      yRange: [0.5, 10],
      zVar: "K",
      zRange: [0, 250],
      plotType: "surface",
      width: 600,
      height: 600,
      surfaces: [
        {
          id: "kinetic-energy-3d",
          color: "Viridis",
          opacity: 0.7,
          showInLegend: true
        }
      ]
    },
  ]
};`;
