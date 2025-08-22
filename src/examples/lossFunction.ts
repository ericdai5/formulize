export const lossFunction = `const config = {
  formulas: [
    {
      name: "Loss Function with Regularization",
      function: "J(\\\\theta) = \\\\frac{1}{m} \\\\sum_{i=1}^{m} \\\\left( y^{(i)} - \\\\hat{y}^{(i)} \\\\right)^2 + \\\\lambda \\\\sum_{j=1}^{K} ||\\\\theta_j||^2",
      manual: function(variables) {
        var m = variables.m.value;
        var y = variables.y.set;
        var yHat = variables["\\\\hat{y}"].set;
        var lambda = variables["\\\\lambda"].value;
        var theta = variables["\\\\theta"].set;
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
  ],
  variables: {
    "J(\\\\theta)": {
      type: "dependent",
      label: "Loss Function"
    },
    m: {
      type: "input",
      value: 3,
      display: "value",
      precision: 0,
    },
    "y^{(i)}": {
      type: "input",
      memberOf: "y",
      label: "Actual value of the i-th example",
      display: "value",
      index: "i"
    },
    "\\\\hat{y}^{(i)}": {
      type: "input",
      memberOf: "\\\\hat{y}",
      label: "Predicted value of the i-th example",
      display: "value",
      index: "i"
    },
    y: {
      type: "input",
      set: [2.5, 3.0, 7.0],
      label: "Actual value of the i-th example"
    },
    "\\\\hat{y}": {
      type: "input",
      set: [2.0, 4.0, 5.0],
      label: "Predicted value of the i-th example"
    },
    "\\\\lambda": {
      type: "input",
      value: 0.1,
      label: "Regularization parameter",
      display: "value",
    },
    "\\\\theta_j": {
      type: "input",
      memberOf: "\\\\theta",
      label: "Parameter j of the model",
      index: "j",
    },
    "\\\\theta": {
      type: "input",
      set: [0.5, -1.0],
      label: "Parameters of the model",
    },
    K: {
      type: "input",
      label: "Number of features",
      value: 2,
      display: "value",
      precision: 0,
    },
    i: {
      type: "input",
      label: "Index",
      display: "value",
      precision: 0,
    },
    j: {
      type: "input",
      label: "Index",
      display: "value",
      precision: 0,
    }
  },
  computation: {
    engine: "manual",
    mode: "step"
  },
  fontSize: 0.7
};`;
