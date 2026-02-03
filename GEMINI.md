# Step() Function Documentation

This document describes how to use the `step()` function in Formulize configurations.

## Basic Syntax

The `step()` function accepts one or two arguments:

```javascript
step(stepConfig);
step(stepConfig, viewName);
```

## Step Configuration Object

### Simple Format (Single Formula)

Used when there's only one formula or you want a general step:

```javascript
step({
  description: "Description of this step",
  values: [
    ["variableName", value],
    ["anotherVariable", anotherValue],
  ],
  expression: "\\LaTeX expression to highlight",
});
```

### Multi-Formula Format

Used when you have multiple formulas and want to update specific ones:

```javascript
step({
  "formula-id-1": {
    description: "Description for formula 1",
    values: [["var1", val1]],
    expression: "\\LaTeX",
  },
  "formula-id-2": {
    description: "Description for formula 2",
    values: [["var2", val2]],
  },
});
```

## Properties

### `description` (string)

A text description of what this step does. Can include LaTeX math using `$...$` syntax.

```javascript
description: "Calculating individual error for example:";
description: "Final Total Loss $J(\\theta)$:";
description: "$Error = y - prediction = " + error.toFixed(2) + "$";
```

### `values` (array of arrays)

An array of variable-value pairs to display/update. Each pair is `[variableName, value]`.

**IMPORTANT**: This is an array of arrays, NOT an object!

```javascript
// CORRECT
values: [
  ["m", m],
  ["y", y_data],
  ["\\\\hat{y}", yHat_data]
]

// WRONG - Do NOT use object syntax
values: { m: m, y: y_data }  // INCORRECT!
```

Variable names should match the keys in your `variables` config, including LaTeX escaping:

```javascript
values: [
  ["y^{(i)}", y_i],
  ["\\\\hat{y}^{(i)}", yHat_i],
  ["i", index],
];
```

### `expression` (string)

A LaTeX expression to highlight in the formula. This should be a valid LaTeX substring of your formula.

```javascript
// Highlight a portion of the formula
expression: "\\\\frac{1}{m} \\\\sum_{i=1}^{m}";

// Highlight the gradient calculation
expression: "-2x(y - w_t \\cdot x)";

// Highlight the full expression
expression: "\\\\lambda \\\\sum_{j=1}^{K} \\\\left\\\\| \\\\theta_j \\\\right\\\\|^2";
```

**IMPORTANT**: The `expression` is for highlighting LaTeX portions, NOT for displaying computed values!

### `highlight` (array of strings)

An array of variable names to highlight in the formula display.

```javascript
highlight: ["\\\\bar{x}"];
```

## Second Argument: View Name

The optional second argument specifies a view/step point name, used for visualizations:

```javascript
step(
  {
    "update-rule": {
      description: "Calculated next weight",
      values: [["w_{t+1}", w_t_plus_1]],
    },
  },
  "weight-update" // Triggers stepPoints configuration in visualizations
);
```

## Complete Examples

### Example 1: Loss Function with Regularization

```javascript
manual: function(vars) {
  var m = vars.m;
  var y_data = vars.y;

  // Step with description, values, and expression highlight
  step({
    description: "Starting MSE calculation for m examples",
    values: [["m", m], ["y", y_data]],
    expression: "\\\\frac{1}{m} \\\\sum_{i=1}^{m}"
  });

  for (var i = 0; i < m; i++) {
    var y_i = y_data[i];
    var index = i + 1;

    // Step showing current iteration values
    step({
      description: "Get value y:",
      values: [["y^{(i)}", y_i], ["i", index], ["y", y_data]]
    });
  }
}
```

### Example 2: Multi-Formula Gradient Descent

```javascript
manual: function(vars) {
  var x = vars.x;
  var y = vars.y;
  var w_t = vars.w_t;

  var error = y - (w_t * x);

  // Update multiple formulas in one step
  step({
    "loss-function": {
      description: "$Error = y - prediction = " + error.toFixed(2) + "$",
      values: [["y", y], ["w_t", w_t], ["x", x]]
    },
    "gradient": {
      description: "Computing gradient...",
      values: [["\\\\nabla L", nablaL]],
      expression: "-2x(y - w_t \\\\cdot x)"
    }
  });
}
```

## Common Mistakes

1. **Wrong `values` format**: Using object instead of array of arrays

   ```javascript
   // WRONG
   values: { n: 5, sum: 100 }

   // CORRECT
   values: [["n", 5], ["sum", 100]]
   ```

2. **Using `expression` for computed values**: Expression is for LaTeX highlighting, not displaying values

   ```javascript
   // WRONG - trying to show a bracketed value
   expression: "(" + sum + ")";

   // CORRECT - highlighting a formula portion
   expression: "\\\\sum_{i=1}^{n}";
   ```

3. **Missing LaTeX escaping**: In JavaScript strings, backslashes need double escaping
   ```javascript
   // In template literals, use \\\\
   values: [["\\\\bar{x}", average]];
   ```
