export const lossFunction = `const config = {
  formulas: [
    {
      id: "loss-function-regularization",
      latex: "J(\\\\theta) = \\\\frac{1}{m} \\\\sum_{i=1}^{m} \\\\left( y^{(i)} - \\\\hat{y}^{(i)} \\\\right)^2 + \\\\lambda \\\\sum_{j=1}^{K} \\\\left\\\\| \\\\theta_j \\\\right\\\\|^2"
    },
  ],
  variables: {
    "J(\\\\theta)": {
      name: "Loss Function"
    },
    m: {
      default: 3,
      latexDisplay: "value",
      labelDisplay: "none",
      precision: 0,
    },
    "y^{(i)}": {
      name: "i-th actual value",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    "\\\\hat{y}^{(i)}": {
      name: "i-th predicted value",
      latexDisplay: "name",
      labelDisplay: "value",
    },
    y: {
      default: [2.5, 3.0, 7.0],
      name: "Actual values"
    },
    "\\\\hat{y}": {
      default: [2.0, 4.0, 5.0],
      name: "Predicted values"
    },
    "\\\\lambda": {
      default: 0.1,
      name: "Regularization parameter",
      latexDisplay: "value",
    },
    "\\\\theta_j": {
      name: "Parameter j of the model",
    },
    "\\\\theta": {
      default: [0.5, -1.0],
      name: "Parameters of the model",
    },
    K: {
      name: "Number of features",
      default: 2,
      latexDisplay: "value",
      precision: 0,
    },
    i: {
      name: "Index i",
      default: 1,
      latexDisplay: "value",
      precision: 0,
    },
    j: {
      name: "Index j",
      default: 1,
      latexDisplay: "value",
      precision: 0,
    }
  },
  semantics: {
    mode: "step",
    manual: function(vars) {
      var m = vars.m;
      var y_data = vars.y;
      var yHat_data = vars["\\\\hat{y}"];
      var lambda = vars["\\\\lambda"];
      var theta_params = vars["\\\\theta"];
      var mse = 0;
      step({ description: "Starting MSE calculation for m examples", values: [["m", m], ["y", y_data], ["\\\\hat{y}", yHat_data]], expression: "\\\\frac{1}{m} \\\\sum_{i=1}^{m}" });
      for (var i = 0; i < m; i++) {
        var index = i + 1;
        var y_i = y_data[i];
        var yHat_i = yHat_data[i];
        if (i === 0) {
          step({ description: "Get value y:", values: [["y^{(i)}", y_i], ["i", index], ["y", y_data]] });
          step({ description: "Get value $\\\\hat{y}$:", values: [["\\\\hat{y}^{(i)}", yHat_i], ["i", index]] });
        }
        var error = y_i - yHat_i;
        step({ description: "Calculating individual error for example:", values: [["y^{(i)}", y_i], ["\\\\hat{y}^{(i)}", yHat_i], ["i", index]] });
        mse += error * error;
      }
      mse = mse / m;
      step({ description: "Computed Mean Squared Error", values: [["m", m]], expression: "\\\\frac{1}{m} \\\\sum_{i=1}^{m} \\\\left( y^{(i)} - \\\\hat{y}^{(i)} \\\\right)^2" });
      var regularization = 0;
      step({ description: "Starting Regularization calculation", values: [["\\\\lambda", lambda], ["\\\\theta", theta_params]] });
      for (var j = 0; j < theta_params.length; j++) {
        var index_j = j + 1;
        var theta_j = theta_params[j];
        step({ description: "Adding squared parameter to penalty", values: [["\\\\theta_j", theta_j], ["j", index_j]] });
        regularization += theta_j * theta_j;
      }
      var reg_term = lambda * regularization;
      step({ description: "Total Regularization Penalty", values: [["\\\\lambda", lambda]], expression: "\\\\lambda \\\\sum_{j=1}^{K} \\\\left\\\\| \\\\theta_j \\\\right\\\\|^2" });
      var loss = mse + reg_term;
      step({ description: "Final Total Loss $J(\\\\theta)$:", values: [["J(\\\\theta)", loss]], expression: "\\\\frac{1}{m} \\\\sum_{i=1}^{m} \\\\left( y^{(i)} - \\\\hat{y}^{(i)} \\\\right)^2 + \\\\lambda \\\\sum_{j=1}^{K} \\\\left\\\\| \\\\theta_j \\\\right\\\\|^2" });
      vars["J(\\\\theta)"] = loss;
    },
  },
  fontSize: 1.5
};`;
