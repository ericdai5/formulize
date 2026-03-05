export const fittsLaw = `const config = {
  formulas: [
    {
      id: "fitts-law",
      latex: "T_1 = a + b \\\\log \\\\left( \\\\frac{2D}{W} \\\\right)"
    },
    {
      id: "fitts-law-two",
      latex: "T_2 = a + c \\\\log \\\\left( \\\\frac{2D}{W} \\\\right)"
    }
  ],
  variables: {
    T_1: {},
    T_2: {},
    a: 0.1,
    b: 0.3,
    c: 0.5,
    D: {
      input: "drag",
      default: 5,
      range: [1, 20],
      name: "Distance"
    },
    W: {
      input: "drag",
      default: 1,
      range: [0.1, 10],
      name: "Width"
    }
  },
  semantics: function({ vars, data2d }) {
    vars.T_1 = vars.a + vars.b * Math.log((2 * vars.D) / vars.W);
    vars.T_2 = vars.a + vars.c * Math.log((2 * vars.D) / vars.W);
    data2d("fitts_1", {x: vars.W, y: vars.T_1});
    data2d("fitts_2", {x: vars.W, y: vars.T_2});
  },
  graph2d: [{
    id: "fittsGraph",
    xAxisLabel: "W",
    xAxisVar: "W",
    xRange: [0.1, 10],
    yAxisLabel: "T",
    yAxisVar: "T_1",
    yRange: [0, 3],
    lines: [
      {
        dataId: "fitts_1",
        parameter: "W",
        name: "Fitts Law",
        interaction: ["vertical-drag", "D"]
      },
      {
        dataId: "fitts_2",
        parameter: "W",
        name: "Fitts Law",
        interaction: ["vertical-drag", "D"]
      }
    ],
    points: [
      {
        dataId: "fitts_1",
        interaction: ["horizontal-drag", "W"]
      },
      {
        dataId: "fitts_2",
        interaction: ["horizontal-drag", "W"]
      }
    ]
  }]
};`;
