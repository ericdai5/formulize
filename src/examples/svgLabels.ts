export const svgKineticEnergy2D = `const config = {
  formulas: [
    {
      formulaId: "kinetic-energy",
      latex: "K = \\\\frac{1}{2}mv^2",
      expression: "{K} = 0.5 * {m} * {v} * {v}",
      manual: function(variables) {
        var m = variables.m.value;
        var v = variables.v.value;
        variables.K.value = 0.5 * m * Math.pow(v, 2);
      }
    }
  ],
  variables: {
    K: {
      type: "dependent",
      units: "J",
      name: "Kinetic Energy",
      precision: 2,
    },
    m: {
      type: "input",
      value: 1,
      range: [0.1, 10],
      step: 1,
      units: "kg",
      name: "Mass",
      labelDisplay: "svg",
      svgPath: "./mass.svg",
      svgSize: { width: 24, height: 24 }
    },
    v: {
      type: "input",
      value: 2,
      range: [0.1, 100],
      step: 1,
      units: "m/s",
      name: "Velocity",
      labelDisplay: "svg",
      svgPath: "./velocity.svg",
      svgSize: { width: 24, height: 24 }
    }
  },
  computation: {
    engine: "manual"
  },
  visualizations: [
    {
      type: "plot2d",
      xAxisVar: "v",
      yAxisVar: "K",
      lines: [
        {
          name: "Kinetic Energy Formula",
        }
      ]
    }
  ],
  fontSize: 0.8
};`;
