export const summationBasic = `const config = {
  formulas: [
    {
      name: "Summation Basic",
      function: "E = \\\\sum_{x \\\\in X} x P(x)",
      manual: function(variables) {
        var x = variables.x;
        var px = variables["P(x)"];
        var xValues = x.set;
        var expectedValue = 0;
        for (var i = 0; i < xValues.length; i++) {
          var xi = xValues[i];
          var probability = px.map[xi];
          // @View
          expectedValue += xi * probability;
          // @View
        }
        return expectedValue;
      },
    },
  ],
  variables: {
    E: {
      type: "dependent",
      label: "Expected Value",
      precision: 2
    },
    x: {
      type: "input",
      set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      label: "x",
      precision: 0
    },
    "P(x)": {
      type: "input",
      key: "x",
      map: {
        1: 0.05,
        2: 0.08,
        3: 0.12,
        4: 0.15,
        5: 0.20,
        6: 0.18,
        7: 0.12,
        8: 0.06,
        9: 0.03,
        10: 0.01
      },
      label: "P(x)"
    }
  },
  computation: {
    engine: "manual"
  },
  fontSize: 0.7
};

const formula = await Formulize.create(config);
`;
