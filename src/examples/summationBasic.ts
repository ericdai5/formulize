export const summationBasic = `const config = {
  formulas: [
    {
      id: "summation-basic",
      latex: "E = \\\\sum_{x \\\\in X} x P(x)",
      manual: function(vars) {
        var xValues = vars.X;
        var pxValues = vars["P(x)"];
        var expectedValue = 0;
        for (var i = 0; i < xValues.length; i++) {
          var xi = xValues[i];
          var probability = pxValues[i];
          var currExpected = xi * probability;
          // @view "x P(x)"->"The expected value for x should be:"->"currExpected"
          expectedValue += currExpected;
          // @view "E"->"Expected value E is updated"->"expectedValue"
        }
        return expectedValue;
      },
      variableLinkage: {
        "xi": "x",
        "probability": "P(x)",
        "expectedValue": "E",
        "currExpected": "c"
      },
    },
  ],
  variables: {
    E: {
      role: "computed",
      precision: 2,
      name: "Expected Value",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    x: {
      role: "input",
      memberOf: "X",
      precision: 0,
      name: "x: member of X",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    X: {
      role: "input",
      value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      precision: 0,
    },
    "P(x)": {
      role: "input",
      key: "x",
      value: [0.05, 0.08, 0.12, 0.15, 0.20, 0.18, 0.12, 0.06, 0.03, 0.01],
      precision: 2,
      name: "Probability of x",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    c: {
      role: "computed",
      precision: 2,
      name: "Current Expected Value",
      latexDisplay: "name",
      labelDisplay: "value",
    }
  },
  computation: {
    engine: "manual",
    mode: "step"
  },
  fontSize: 0.7
};`;
