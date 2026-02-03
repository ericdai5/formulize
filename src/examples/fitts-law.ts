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
  semantics: {
    manual: function(vars, data3d, data2d) {
      vars.T_1 = vars.a + vars.b * Math.log((2 * vars.D) / vars.W);
      vars.T_2 = vars.a + vars.c * Math.log((2 * vars.D) / vars.W);
      data2d("fitts_1", {x: vars.W, y: vars.T_1});
      data2d("fitts_2", {x: vars.W, y: vars.T_2});
    }
  },
  visualizations: [{
    type: "plot2d",
    xAxisLabel: "W",
    xAxisVar: "W",
    xRange: [0.1, 10],
    yAxisLabel: "T",
    yAxisVar: "T",
    yRange: [0, 3],
    graphs: [
      {
        type: "line",
        id: "fitts_1",
        parameter: "W",
        name: "Fitts Law",
        interaction: ["vertical-drag", "D"]
      },
      {
        type: "point",
        id: "fitts_1",
        interaction: ["horizontal-drag", "W"]
      },
      {
        type: "line",
        id: "fitts_2",
        parameter: "W",
        name: "Fitts Law",
        interaction: ["vertical-drag", "D"]
      },
      {
        type: "point",
        id: "fitts_2",
        interaction: ["horizontal-drag", "W"]
      }
    ]
  }]
};`;
