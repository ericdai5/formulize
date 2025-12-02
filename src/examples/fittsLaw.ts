export const fittsLaw = `const config = {
  formulas: [
    {
      id: "fitts-law",
      latex: "T = a + b \\\\log \\\\left( \\\\frac{2D}{W} \\\\right)"
    },
    {
      id: "fitts-law-two",
      latex: "T = a + c \\\\log \\\\left( \\\\frac{2D}{W} \\\\right)"
    }
  ],
  variables: {
    T: {
      role: "computed",
    },
    a: 0.1,
    b: 0.3,
    c: 0.5,
    D: {
      role: "input",
    },
    W: {
      role: "input",
    }
  },
  semantics: {
    engine: "symbolic-algebra",
    expressions: {
      "fitts-law": "{T} = {a} + {b} * log((2 * {D}) / {W})",
      "fitts-law-two": "{T} = {a} + {c} * log((2 * {D}) / {W})"
    }
  },
  visualizations: [{
    type: "plot2d",
    xAxis: "W",
    yAxis: "T",
    lines: [
      { 
        name: "fitts-law" 
      },
      {
        name: "fitts-law-two"
      }
    ],
  }, {
    type: "plot2d",
  }]
};`;
