export const summationDefault = `const config = {
  formulas: [
    {
      name: "Summation Default",
      function: "E = \\\\sum_{x \\\\in X} x P(x)",
      manual: function(variables) {
        var xValues = variables.x.set;
        var pxValues = variables["P(x)"].set;
        var expectedValue = 0;
        for (var i = 0; i < xValues.length; i++) {
          var xi = xValues[i];
          var probability = pxValues[i];
          expectedValue += xi * probability;
        }
        return expectedValue;
      },
      variableLinkage: {
        "xi": "x",
        "probability": "P(x)",
        "expectedValue": "E"
      },
    },
  ],
  variables: {
    E: {
      type: "dependent",
      precision: 2
    },
    x: {
      type: "input",
      memberOf: "X",
      precision: 0
    },
    X: {
      type: "input",
      set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      precision: 0
    },
    "P(x)": {
      type: "input",
      key: "x",
      set: [0.05, 0.08, 0.12, 0.15, 0.20, 0.18, 0.12, 0.06, 0.03, 0.01],
      precision: 2
    }
  },
  controls: [
    {
      type: "array",
      variable: "x",
      orientation: "horizontal",
      index: "i"
    },
    {
      type: "array",
      variable: "P(x)",
      orientation: "horizontal",
      index: "i"
    }
  ],
  computation: {
    engine: "manual",
    mode: "step"
  },
  fontSize: 0.7
};

const formula = await Formulize.create(config);
`;
