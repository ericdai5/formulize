export const simpleLoss = `const config = {
  formulas: [
    {
      id: "loss-function",
      latex: "L = (y - w_t \\\\cdot x)^2",
    },
  ],
  variables: {
    L: { name: "Loss" },
    w_t: { default: 0.5, name: "Weight" },
    x: {
      default: 1.5,
      name: "Feature",
      input: "drag",
      range: [0, 4],
      step: 0.1,
    },
    y: {
      default: 3,
      name: "Label",
      input: "inline",
      range: [0, 4],
    },
  },
  semantics: function ({ vars, sample }) {
    var error = vars.y - vars.w_t * vars.x;
    vars.L = error * error;
    sample("loss", { x: vars.w_t, y: vars.L });
  },
  graph2d: [
    {
      id: "loss-plot",
      xAxisVar: "w_t",
      yAxisVar: "L",
      xRange: [0, 4],
      yRange: [0, 10],
      lines: [
        {
          sampleId: "loss",
          parameter: "w_t",
          color: "#ef4444",
          interaction: ["horizontal-drag", "y"],
        },
      ],
    },
  ],
};`;
