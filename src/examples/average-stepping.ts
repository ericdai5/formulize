export const averageStepping = `const config = {
  formulas: [
    {
      id: "average",
      latex: "\\\\mu = \\\\frac{1}{n} \\\\sum_{i=1}^{n} X_i"
    },
  ],
  variables: {
    "\\\\mu": { name: "Mean" },
    n: { name: "Count" },
    X_i: { name: "Value at index i", precision: 0 },
    X: { default: [10, 20, 30], name: "Value set" },
  },
  stepping: true,
  semantics: function({ vars, step }) {
    vars.n = vars.X.length;
    var sum = 0;
    vars["\\\\mu"] = 0;
    for (var i = 0; i < vars.n; i++) {
      vars.X_i = vars.X[i];
      sum = sum + vars.X_i;
      vars["\\\\mu"] = sum / (i + 1);
      step({
        description: "Running average at index " + i + " is " + vars["\\\\mu"],
        labels: {
          "\\\\sum_{i=1}^{n} X_i": "sum is now " + sum,
          "n": "n is now " + (i + 1),
          "X_i": vars.X_i,
          "X": vars.X,
        }
      });
    }
    vars["\\\\mu"] = Math.round(vars["\\\\mu"] * 100) / 100;
  },
  fontSize: 1.5
};`;
