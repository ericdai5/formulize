const kineticEnergyExample = `const config = {
  formulas: [
    {
      name: "Kinetic Energy Formula",
      function: "K = \\\\frac{1}{2}mv^2"
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
      units: "kg",
      label: "Mass"
    },
    v: {
      type: "input",
      value: 2,
      range: [0.1, 100],
      units: "m/s",
      label: "Velocity"
    }
  },
  computation: {
    engine: "symbolic-algebra",
    expressions: ["{K} = 0.5 * {m} * {v} * {v}"]
  },
  
  visualizations: [
    {
      type: "plot2d",
      id: "energyPlot",
      config: {
        title: "Kinetic Energy vs. Velocity",
        xAxis: {
          variable: "v",
          label: "Velocity (m/s)",
          min: 0,
          max: 20
        },
        yAxis: {
          variable: "K",
          label: "Kinetic Energy (J)",
          min: 0,
          max: 200
        },
        width: 600,
        height: 600
      }
    }
  ]
};

const formula = await Formulize.create(config);`;

export default kineticEnergyExample;
