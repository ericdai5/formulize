export const task2instruction = `const config = {
  formulas: [
    {
      id: "average",
      latex: "\\\\bar{X} = \\\\frac{1}{n} \\\\sum_{i=1}^{n} X_i"
    },
  ],
  variables: {
    "\\\\bar{X}": {
      default: 0,
      name: "Average",
    },
    n: {
      default: 0,
      name: "Count",
    },
    i: {
      name: "Index",
    },
    X_i: {
      name: "Value at index i",
    },
    X: {
      default: [10, 20, 30, 40, 50],
      name: "Data values",
    },
  },
  semantics: {
    mode: "step",
    manual: function(vars) {
      var xValues = vars.X;
      var n = xValues.length;
      var sum = 0;
      var average = 0;
      for (var i = 0; i < n; i++) {
        var xi = xValues[i];
        sum = sum + xi;
      }
      average = sum / n;
      average = Math.round(average * 100) / 100;
      return average;
    },
  },
  fontSize: 1.5
};`;
