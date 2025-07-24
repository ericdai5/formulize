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
      precision: 2,
      label: "Loss Function"
    },
    m: {
      type: "input",
      value: 3,
      precision: 0,
      display: "value",
    },
    "y^{(i)}": {
      type: "input",
      memberOf: "y",
      precision: 1,
      label: "y^{(i)}: actual value of the i-th training example",
      index: "i"
    },
    "\\\\hat{y}^{(i)}": {
      type: "input",
      memberOf: "\\\\hat{y}",
      precision: 1,
      label: "\\\\hat{y}^{(i)}: predicted value of the i-th training example",
      index: "i"
    },
    y: {
      type: "input",
      set: [2.5, 3.0, 7.0],
      precision: 1,
      label: "y: actual value of the i-th training example"
    },
    "\\\\hat{y}": {
      type: "input",
      set: [2.0, 4.0, 5.0],
      precision: 1,
      label: "\\\\hat{y}: predicted value of the i-th training example"
    },
    "\\\\lambda": {
      type: "input",
      value: 0.1,
      label: "\\\\lambda: regularization parameter",
      precision: 1,
      display: "value",
    },
    "\\\\theta_j": {
      type: "input",
      memberOf: "\\\\theta",
      label: "\\\\theta: parameters of the model",
      index: "j",
      precision: 1
    },
    "\\\\theta": {
      type: "input",
      set: [0.5, -1.0],
      label: "\\\\theta: parameters of the model",
      precision: 1
    },
    K: {
      type: "input",
      label: "K: number of features",
      value: 2,
      precision: 0,
      display: "value",
    },
    i: {
      type: "input",
      label: "Index",
      precision: 0,
      display: "value",
    },
    j: {
      type: "input",
      label: "Index",
      precision: 0,
      display: "value",
    }
  },
  controls: [
    {
      type: "array",
      variable: "y",
      orientation: "horizontal",
      index: "i"
    },
    {
      type: "array",
      variable: "\\\\hat{y}",
      orientation: "horizontal",
      index: "i"
    },
    {
      type: "slider",
      variable: "\\\\lambda",
      min: 0,
      max: 0.2,
      step: 0.01
    },
    {
      type: "array",
      variable: "\\\\theta",
      orientation: "horizontal",
      index: "j"
    }
  ],
  computation: {
    engine: "manual",
    mode: "step"
  },
  fontSize: 0.7
};

const formula = await Formulize.create(config);
`;
