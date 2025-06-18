export const gravitationalPotential = `const config = {
  formulas: [
    {
      name: "Gravitational Potential Energy Formula",
      function: "U = mgh",
      expression: "{U} = {m} * {g} * {h}"
    }
  ],
  variables: {
    U: {
      type: "dependent",
      units: "J",
      label: "Potential Energy",
      precision: 2
    },
    m: {
      type: "input",
      value: 1,
      range: [0.1, 100],
      units: "kg",
      label: "Mass"
    },
    g: {
      type: "input",
      value: 9.8,
      range: [1, 20],
      units: "m/s²",
      label: "Gravity"
    },
    h: {
      type: "input",
      value: 10,
      range: [0, 1000],
      units: "m",
      label: "Height"
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
      xVar: "h",
      xRange: [0, 100],
      yVar: "U",
      yRange: [0, 10000],
      width: 600,
      height: 600
    }
  ]
};

const formula = await Formulize.create(config);`;
