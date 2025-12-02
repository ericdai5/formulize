export const lossFunction = `const config = {
  formulas: [
    {
      id: "loss-function-regularization",
      latex: "J(\\\\theta) = \\\\frac{1}{m} \\\\sum_{i=1}^{m} \\\\left( y^{(i)} - \\\\hat{y}^{(i)} \\\\right)^2 + \\\\lambda \\\\sum_{j=1}^{K} ||\\\\theta_j||^2"
    },
  ],
  variables: {
    "J(\\\\theta)": {
      role: "computed",
      name: "Loss Function"
    },
    m: {
      role: "input",
      default: 3,
      latexDisplay: "value",
      precision: 0,
    },
    "y^{(i)}": {
      role: "input",
      memberOf: "y",
      name: "Actual value of the i-th example",
      latexDisplay: "value",
      index: "i"
    },
    "\\\\hat{y}^{(i)}": {
      role: "input",
      memberOf: "\\\\hat{y}",
      name: "Predicted value of the i-th example",
      latexDisplay: "value",
      index: "i"
    },
    y: {
      role: "input",
      default: [2.5, 3.0, 7.0],
      name: "Actual value of the i-th example"
    },
    "\\\\hat{y}": {
      role: "input",
      default: [2.0, 4.0, 5.0],
      name: "Predicted value of the i-th example"
    },
    "\\\\lambda": {
      role: "input",
      default: 0.1,
      name: "Regularization parameter",
      latexDisplay: "value",
    },
    "\\\\theta_j": {
      role: "input",
      memberOf: "\\\\theta",
      name: "Parameter j of the model",
      index: "j",
    },
    "\\\\theta": {
      role: "input",
      default: [0.5, -1.0],
      name: "Parameters of the model",
    },
    K: {
      role: "input",
      name: "Number of features",
      default: 2,
      latexDisplay: "value",
      precision: 0,
    },
    i: {
      role: "input",
      name: "Index",
      latexDisplay: "value",
      precision: 0,
    },
    j: {
      role: "input",
      name: "Index",
      latexDisplay: "value",
      precision: 0,
    }
  },
  semantics: {
    engine: "manual",
    mode: "step",
    manual: function(vars) {
      var m = vars.m;
      var y = vars.y;
      var yHat = vars["\\\\hat{y}"];
      var lambda = vars["\\\\lambda"];
      var theta = vars["\\\\theta"];
      var mse = 0;
      for (var i = 0; i < m; i++) {
        var index = i + 1;
        var yi = y[i];
        var yHati = yHat[i];
        var error = yi - yHati;
        mse += error * error;
      }
      mse = mse / m;
      var regularization = 0;
      for (var j = 0; j < theta.length; j++) {
        var indexj = j + 1;
        var thetaj = theta[j];
        regularization += thetaj * thetaj;
      }
      regularization = lambda * regularization;
      var loss = mse + regularization;
      return loss;
    },
    variableLinkage: {
      "index": "i",
      "yi": "y^{(i)}",
      "yHati": "\\\\hat{y}^{(i)}",
      "lambda": "\\\\lambda",
      "indexj": "j",
      "thetaj": "\\\\theta_j",
      "loss": "J(\\\\theta)"
    },
  },
  fontSize: 1.5
};`;
