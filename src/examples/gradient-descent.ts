export const gradientDescent = `const config = {
  formulas: [
    { id: "loss-function", latex: "L = (y - w_t \\\\cdot x)^2" },
    { id: "update-weight", latex: "w_{t+1} = w_t - \\\\alpha \\\\cdot (-2x(y - w_t \\\\cdot x))" },
  ],
  variables: {
    L:           { name: "Loss" },
    w_t:         { default: 0.5, name: "Current Weight" },
    "w_{t+1}":   { default: 0.5, name: "Next Weight" },
    "\\\\alpha": { default: 0.1, input: "drag", range: [0, 1], name: "Learning Rate"},
    x:           { default: 1.5, input: "drag", range: [0, 4], name: "Feature"},
    y:           { default: 3.0, input: "drag", range: [0, 4], name: "Label"},
  },
  stepping: true,
  semantics: function ({ vars, sample, step, latex }) {
    var w = vars.w_t;
    for (var t = 0; t < 6; t++) {
      var error = vars.y - w * vars.x;
      var loss = error * error;
      var gradient = -2 * vars.x * error;
      sample("initial-loss", { x: w, y: loss });
      step({
        "loss-function": {
          labels: {
            "L": "Loss is " + latex(loss).precision(2),
            "y - w_t \\\\cdot x": "Error is " + latex(error).precision(2),
          },
        },
        "update-weight": {
          labels: {
            "w_t": w,
            "\\\\alpha": vars["\\\\alpha"],
            "w_{t+1}": w - vars["\\\\alpha"] * gradient,
            "(-2x(y - w_t \\\\cdot x)": "Gradient is " + latex(gradient).precision(2),
          },
        }
      }, "gd-step");
      w -= vars["\\\\alpha"] * gradient;
      vars.L = (vars.y - w * vars.x) * (vars.y - w * vars.x);
      sample("final-loss", { x: w, y: vars.L });
    }
    vars["w_{t+1}"] = w;
  },
  graph2d: [
    {
      id: "gradient-descent",
      xAxisVar: "w_t", yAxisVar: "L",
      yRange: [-5, 10], xRange: [0, 4],
      lines: [{
        sampleId: "initial-loss",
        parameter: "w_t",
        interaction: ["horizontal-drag", "y"],
      }],
      points: [{
        sampleId: "initial-loss", 
        stepId: "gd-step", persistence: true,
      }],
      vectors: [{
        startSampleId: "initial-loss", endSampleId: "final-loss",
        stepId: "gd-step", persistence: true,
        curved: -1,
      }],
    },
  ],
};`;
