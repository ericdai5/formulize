// Kinetic Energy 3D example formula code
const kineticEnergy3DExample = `// Formulize configuration - 3D Kinetic Energy Example
// This JavaScript code demonstrates 3D visualization capabilities

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
        value: 2,
        range: [0.5, 5],
        units: "kg",
        label: "Mass"
      },
      v: {
        type: "input",
        value: 3,
        range: [0.5, 10],
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
      type: "plot3d",
      id: "energy3DPlot",
      config: {
        title: "3D Kinetic Energy Surface",
        xAxis: {
          variable: "m",
          label: "Mass (kg)",
          min: 0.5,
          max: 5
        },
        yAxis: {
          variable: "v",
          label: "Velocity (m/s)",
          min: 0.5,
          max: 10
        },
        zAxis: {
          variable: "K",
          label: "Kinetic Energy (J)",
          min: 0,
          max: 250
        },
        plotType: "surface",
        width: 600,
        height: 600
      }
    },
    {
      type: "plot3d",
      id: "energyScatterPlot",
      config: {
        title: "3D Kinetic Energy Scatter Plot",
        xAxis: {
          variable: "m",
          label: "Mass (kg)",
          min: 0.5,
          max: 5
        },
        yAxis: {
          variable: "v",
          label: "Velocity (m/s)",
          min: 0.5,
          max: 10
        },
        zAxis: {
          variable: "K",
          label: "Kinetic Energy (J)",
          min: 0,
          max: 250
        },
        plotType: "scatter",
        width: 600,
        height: 600
      }
    }
  ]
};

// Create the Formulize instance with the configuration
const formula = await Formulize.create(config);`;

export default kineticEnergy3DExample;
