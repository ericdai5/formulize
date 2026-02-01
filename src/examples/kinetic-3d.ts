export const kinetic3D = `const config = {
  formulas: [
    {
      id: "kinetic-energy-3d",
      latex: "K = \\\\frac{1}{2}mv^2"
    }
  ],
  variables: {
    K: {
      role: "computed",
      units: "J",
      name: "Kinetic Energy",
      precision: 2
    },
    m: {
      role: "input",
      default: 2,
      range: [0.5, 5],
      units: "kg",
      name: "Mass"
    },
    v: {
      role: "input",
      default: 3,
      range: [0.5, 10],
      units: "m/s",
      name: "Velocity"
    }
  },
  semantics: {
    manual: function(vars) {
      vars.K = 0.5 * vars.m * vars.v * vars.v;
    }
  },

  visualizations: [
    {
      type: "plot3d",
      id: "energy3DPlot",
      title: "3D Kinetic Energy Surface",
      xAxis: "m",
      xRange: [0.5, 5],
      yAxis: "v",
      yRange: [0.5, 10],
      zVar: "K",
      zRange: [0, 250],
      plotType: "surface",

      surfaces: [
        {
          id: "kinetic-energy-3d",
          sampleOver: ["m", "v"],
          outputs: { x: "m", y: "v", z: "K" },
          color: "Viridis",
          opacity: 0.7,
          showInLegend: true
        }
      ]
    },
  ]
};`;
