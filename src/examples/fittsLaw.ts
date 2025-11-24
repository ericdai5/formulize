export const fittsLaw = `const config = {
  formulas: [
    {
      id: "fitts-law",
      latex: "T = a + b \\\\log \\\\left( \\\\frac{2D}{W} \\\\right)",
      expression: "{T} = {a} + {b} * log((2 * {D}) / {W})"
    }
  ],
  variables: {
    T: {
      role: "computed",
    },
    a: 0.1,
    b: 0.3,
    D: {
      role: "input",
    },
    W: {
      role: "input",
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },
  visualizations: [{
    type: "plot2d",
    xAxis: "D",
    yAxis: "T",
    lines: [{ name: "line" }],
  }, {
    type: "plot2d",
    xAxis: "W",
    yAxis: "T",
    lines: [{ name: "line" }],
  }]
};`;
