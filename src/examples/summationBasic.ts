export const summationBasic = `const config = {
  formulas: [
    {
      id: "summation-basic",
      latex: "E = \\\\sum_{x \\\\in X} x P(x)"
    },
  ],
  variables: {
    E: {
      role: "computed",
      default: 0,
      name: "Expected Value",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    x: {
      role: "input",
      name: "x: member of X",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    X: {
      role: "input",
      default: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      latexDisplay: "name",
      labelDisplay: "value",
    },
    "P(x)": {
      role: "input",
      key: "x",
      default: [0.05, 0.08, 0.12, 0.15, 0.20, 0.18, 0.12, 0.06, 0.03, 0.01],
      name: "Probability of x",
      latexDisplay: "name",
      labelDisplay: "value",
    }
  },
  semantics: {
    engine: "manual",
    mode: "step",
    manual: function(vars) {
      var xValues = vars.X;
      var pxValues = vars["P(x)"];
      var expectedValue = vars.E;
      for (var i = 0; i < xValues.length; i++) {
        var xi = xValues[i];
        var probability = pxValues[i];
        if (i === 0) {
          view("Get a value x from X", { "x": xValues, "X": xi });
          view("Get a value P(x) from P(x)", { "P(x)": probability });
        }
        var currExpected = Math.round(xi * probability * 100) / 100;
        if (i === 0) {
          view("This evaluates to:", { "x": xi, "P(x)": probability });
        }
        expectedValue = Math.round((expectedValue + currExpected) * 100) / 100;
        switch (i) {
          case 0:
            view("add up term into E", { "E": expectedValue });
            break;
          case 1:
            view("add next term...", { "E": expectedValue });
            break;
          case xValues.length - 1:
            view("finish accumulating weighted sum", { "E": expectedValue });
            break;
        }
      }
      return expectedValue;
    },
  },
  fontSize: 1.5
};`;
