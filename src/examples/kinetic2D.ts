export const kinetic2D = `const config = {
  formulas: [
    {
      id: "kinetic-energy",
      latex: "K = \\\\frac{1}{2}mv^2",
      expression: "{K} = 0.5 * {m} * {v} * {v}",
      manual: function({ m, v }) {
        return 0.5 * m * Math.pow(v, 2);
      }
    }
  ],
  variables: {
    K: {
      type: "dependent",
      units: "J",
      name: "Kinetic Energy",
      precision: 2
    },
    m: {
      type: "input",
      value: 1,
      range: [0.1, 10],
      step: 1,
      units: "kg",
      name: "Mass"
    },
    v: {
      type: "input",
      value: 2,
      range: [0.1, 100],
      step: 1,
      units: "m/s",
      name: "Velocity"
    }
  },
  computation: {
    engine: "manual"
  },
  visualizations: [
    {
      type: "plot2d",
      xAxis: "v",
      yAxis: "K",
      lines: [
        {
          name: "Kinetic Energy Formula",
        }
      ]
    }
  ],
  fontSize: 0.8,
  labelFontSize: 0.6,
  labelNodeStyle: { outline: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', backgroundColor: '#ffffff' },
  formulaNodeStyle: { outline: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', backgroundColor: '#ffffff' }
};`;
