export const task2training = `const config = {
  formulas: [
    {
      id: "linear-equation",
      latex: "y = mx + b"
    }
  ],
  variables: {
    y: {
      default: 0,
      name: "y-value",
      latexDisplay: "name",
      labelDisplay: "value"
    },
    x: {
      default: 3,
      range: [-10, 10],
      name: "x"
    },
    m: {
      default: 2,
      range: [-5, 5],
      name: "Slope"
    },
    b: {
      default: 1,
      range: [-10, 10],
      name: "Y-intercept"
    }
  },
  stepping: true,
  semantics: function(vars, data3d, data2d, step) {
    var x = vars.x;
    var m = vars.m;
    var b = vars.b;
    var mx = m * x;
    step({ description: "Compute $mx = " + m + " \\\\cdot " + x + " = " + mx + "$", values: [["m", m], ["x", x]] });
    var y = mx + b;
    step({ description: "Add $b$: $y = " + mx + " + " + b + " = " + y + "$", values: [["y", y]] });
    vars.y = y;
  },
  fontSize: 1.5
};`;
