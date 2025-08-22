export const kinetic2D = `const config = {
  formulas: [
    {
      name: "Kinetic Energy Formula",
      function: "K = \\\\frac{1}{2}mv^2",
      expression: "{K} = 0.5 * {m} * {v} * {v}",
      manual: function(variables) {
        var m = variables.m.value;
        var v = variables.v.value;
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
      lines: [
        {
          color: "#3b82f6",
          name: "Kinetic Energy",
          showInLegend: true
        }
      ]
    }
  ],
  fontSize: 0.8
};`;
