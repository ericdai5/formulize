// Kinetic Energy example formula code
const kineticEnergyExample = `// Formulize configuration - Kinetic Energy Example
// This JavaScript code is directly executed by the Formulize API

const config = {
  formula: {
    expression: "K = \\\\frac{1}{2}mv^2",
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
      formula: "{K} = 0.5 * {m} * {v} * {v}"
    }
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
        width: 800,
        height: 500
      }
    }
  ]
};

// Create the Formulize instance with the configuration
const formula = await Formulize.create(config);`;

export default kineticEnergyExample;
