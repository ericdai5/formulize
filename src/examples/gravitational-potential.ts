export const gravitationalPotential = `const config = {
  formulas: [
    {
      id: "gravitational-potential",
      latex: "U = mgh"
    }
  ],
  variables: {
    U: {
      units: "J",
      name: "Potential Energy",
      precision: 2
    },
    m: {
      input: "drag",
      default: 1,
      range: [0.1, 100],
      units: "kg",
      name: "Mass"
    },
    g: {
      input: "drag",
      default: 9.8,
      range: [1, 20],
      units: "m/s²",
      name: "Gravity"
    },
    h: {
      input: "drag",
      default: 10,
      range: [0, 1000],
      units: "m",
      name: "Height"
    }
  },
  semantics: function(vars, data3d, data2d) {
    vars.U = vars.m * vars.g * vars.h;
    data2d("potential", {x: vars.h, y: vars.U});
  },

  visualizations: [
    {
      type: "plot2d",
      id: "potentialEnergyPlot",
      title: "Potential Energy vs. Height",
      xAxisLabel: "h",
      xAxisVar: "h",
      xRange: [0, 100],
      yAxisLabel: "U",
      yAxisVar: "U",
      yRange: [0, 10000],
      graphs: [
        {
          type: "line",
          id: "potential",
          parameter: "h",
          range: [0, 100],
          color: "#10b981",
          name: "Potential Energy",
          interaction: ["vertical-drag", "m"]
        },
        {
          type: "point",
          id: "potential",
          color: "#10b981",
          interaction: ["horizontal-drag", "h"]
        }
      ]
    }
  ]
};`;
