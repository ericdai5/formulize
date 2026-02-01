export const gravitationalPotential = `const config = {
  formulas: [
    {
      id: "gravitational-potential",
      latex: "U = mgh"
    }
  ],
  variables: {
    U: {
      role: "computed",
      units: "J",
      name: "Potential Energy",
      precision: 2
    },
    m: {
      role: "input",
      default: 1,
      range: [0.1, 100],
      units: "kg",
      name: "Mass"
    },
    g: {
      role: "input",
      default: 9.8,
      range: [1, 20],
      units: "m/s²",
      name: "Gravity"
    },
    h: {
      role: "input",
      default: 10,
      range: [0, 1000],
      units: "m",
      name: "Height"
    }
  },
  semantics: {
    expressions: {
      "gravitational-potential": "{U} = {m} * {g} * {h}"
    }
  },
  
  visualizations: [
    {
      type: "plot2d",
      id: "potentialEnergyPlot",
      title: "Potential Energy vs. Height",
      xAxis: "h",
      xRange: [0, 100],
      yAxis: "U",
      yRange: [0, 10000],

      lines: [
        {
          color: "#10b981",
          name: "Potential Energy",
          showInLegend: true
        }
      ]
    }
  ]
};`;
