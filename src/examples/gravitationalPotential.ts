export const gravitationalPotential = `const config = {
  formulas: [
    {
      id: "gravitational-potential",
      latex: "U = mgh",
      expression: "{U} = {m} * {g} * {h}"
    }
  ],
  variables: {
    U: {
      type: "dependent",
      units: "J",
      name: "Potential Energy",
      precision: 2
    },
    m: {
      type: "input",
      value: 1,
      range: [0.1, 100],
      units: "kg",
      name: "Mass"
    },
    g: {
      type: "input",
      value: 9.8,
      range: [1, 20],
      units: "m/s²",
      name: "Gravity"
    },
    h: {
      type: "input",
      value: 10,
      range: [0, 1000],
      units: "m",
      name: "Height"
    }
  },
  computation: {
    engine: "symbolic-algebra"
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
      width: 600,
      height: 600,
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
