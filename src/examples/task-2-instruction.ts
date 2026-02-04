export const task2instruction = `const config = {
  formulas: [
    {
      id: "average",
      latex: "\\\\bar{x} = \\\\frac{1}{n} \\\\sum_{i=1}^{n} x_i"
    },
  ],
  variables: {
    "\\\\bar{x}": {
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
    x_i: {
      name: "Value at index i",
    },
    x: {
      default: [10, 20, 30, 40, 50],
      name: "Data values",
    },
  },
  stepping: true,
  semantics: function(vars, data3d, data2d, step) {
    var xValues = vars.x;
    var n = xValues.length;
    var sum = 0;
    var average = 0;

    // Task 2.1 - Step 1: Before the loop
    step({
      description: "Starting with dataset of " + n + " values",
      values: [["n", n], ["x", xValues]]
    });

    for (var i = 0; i < n; i++) {
      var xi = xValues[i];
      sum = sum + xi;

      // Task 2.1 - Step 2: Inside the loop - running sum with bracket expression
      step({
        description: "Adding value $x_{" + (i + 1) + "} = " + xi + "$ to sum",
        values: [["x_i", xi], ["i", i + 1]],
        expression: "\\\\left( \\\\sum_{i=1}^{n} x_i \\\\right)"
      });

      // Task 2.3: Running average at each iteration
      var runningAverage = Math.round((sum / (i + 1)) * 100) / 100;
      step({
        description: "After " + (i + 1) + " value" + ((i + 1) > 1 ? "s" : "") + ": Average = " + runningAverage,
        values: [["\\\\bar{x}", runningAverage]]
      });
    }

    average = sum / n;
    average = Math.round(average * 100) / 100;

    // Task 2.1 - Step 3: After the loop - summary step
    step({
      description: "Total sum " + sum + " divided by n = " + n,
      values: [["\\\\bar{x}", average], ["n", n]],
      highlight: ["\\\\bar{x}"]
    });
    vars["\\\\bar{x}"] = average;
  },
  fontSize: 1.5
};`;
