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
      type: "dependent",
      precision: 2,
      name: "Time"
    },
    a: {
      type: "constant",
      value: 0.1,
      range: [0.1, 10],
      step: 0.1,
    },
    b: {
      type: "constant",
      value: 0.3,
      range: [0, 10],
      step: 0.1,
    },
    D: {
      type: "input",
      value: 50,
      range: [0, 200],
      step: 1,
      name: "Distance"
    },
    W: {
      type: "input",
      value: 10,
      step: 1,
      range: [1, 500],
      name: "Width"
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },
  visualizations: [{
    type: "plot2d",
    xAxis: "D",
    xRange: [0, 200],
    yAxis: "T",
    yRange: [0, 2],
    lines: [{ name: "line" }],
  }, {
    type: "plot2d",
    xAxis: "W",
    xRange: [0, 200],
    yAxis: "T",
    yRange: [0, 2],
    lines: [{ name: "line" }],
  }]
};`;
