export const kineticEnergy = `const config = {
  formulas: [
    {
      name: "Kinetic Energy Formula",
      function: "K = \\\\frac{1}{2}mv^2",
      expression: "{K} = 0.5 * {m} * {v} * {v}",
      manual: (variables) => {
        const m = variables.m.value;
        const v = variables.v.value;
        return 0.5 * m * Math.pow(v, 2);
      }
    }
  ],
  variables: {
    K: {
      type: "dependent",
      units: "J",
      label: "Kinetic Energy",
      precision: 2
    },
    m: {
      type: "input",
      value: 1,
      range: [0.1, 10],
      step: 1,
      units: "kg",
      label: "Mass"
    },
    v: {
      type: "input",
      value: 2,
      range: [0.1, 100],
      step: 1,
      units: "m/s",
      label: "Velocity"
    }
  },
  computation: {
    engine: "manual"
  },
  
  visualizations: [
    {
      type: "plot2d",
      id: "energyPlot",
      title: "Kinetic Energy vs. Velocity",
      xVar: "v",
      xRange: [0, 20],
      yVar: "K",
      yRange: [0, 200],
      width: 600,
      height: 600,
      surfaces: [
        {
          formulaName: "Kinetic Energy Formula",
          color: "Viridis",
          opacity: 0.7,
          showInLegend: true
        }
      ]
    }
  ],
  fontSize: 0.8
};

const formula = await Formulize.create(config);`;
