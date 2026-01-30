export const average = `const config = {
  formulas: [
    {
      id: "average",
      latex: "\\\\bar{X} = \\\\frac{1}{n} \\\\sum_{i=1}^{n} X_i"
    },
  ],
  variables: {
    "\\\\bar{X}": {
      role: "computed",
      default: 0,
      name: "Average",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    n: {
      role: "computed",
      default: 0,
      name: "Count",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    i: {
      role: "input",
      name: "Index",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    X_i: {
      role: "input",
      name: "Value at index i",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    X: {
      role: "input",
      default: [10, 20, 30, 40, 50],
      name: "Data values",
      latexDisplay: "name",
      labelDisplay: "value",
    },
  },
  semantics: {
    engine: "manual",
    mode: "step",
    manual: function(vars) {
      var xValues = vars.X;
      var n = xValues.length;
      var sum = 0;
      var average = 0;
      step({ description: "Get the count $n$ of values", values: [["n", n]] });
      for (var i = 0; i < n; i++) {
        var xi = xValues[i];
        step({ description: "Get value $X_i$ from $X$", values: [["i", i + 1], ["X_i", xi], ["X", xValues]] });
        step({ description: "Add $X_i$ to running sum of " + sum, values: [["X_i", xi]] });
        sum = sum + xi;
        step({ description: "Sum is now " + sum, values: [["sum", sum]] });
      }
      average = sum / n;
      average = Math.round(average * 100) / 100;
      step({ description: "Divide $sum = " + sum + "$ by $n = " + n + "$ to get average.", values: [["\\\\bar{X}", average]] });
      return average;
    },
  },
  fontSize: 1.5
};`;
