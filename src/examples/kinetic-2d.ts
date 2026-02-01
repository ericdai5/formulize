export const kinetic2D = `const config = {
  formulas: [
    {
      id: "kinetic-energy",
      latex: "K = \\\\frac{1}{2}mv^2"
    }
  ],
  variables: {
    K: {
      name: "Kinetic Energy",
      precision: 2
    },
    m: {
      input: "drag",
      default: 1,
      range: [0.1, 10],
      step: 1,
      name: "Mass"
    },
    v: {
      input: "drag",
      default: 2,
      range: [0.1, 100],
      step: 1,
      name: "Velocity"
    }
  },
  semantics: {
    manual: function(vars) {
      vars.K = 0.5 * vars.m * Math.pow(vars.v, 2);
    }
  },
  visualizations: [
    {
      type: "plot2d",
      xAxis: "v",
      yAxis: "K",
    }
  ],
  fontSize: 1.5,
  labelFontSize:  1.0,
  labelNodeStyle: { outline: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', backgroundColor: '#ffffff' },
  formulaNodeStyle: { outline: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', backgroundColor: '#ffffff' }
};`;
