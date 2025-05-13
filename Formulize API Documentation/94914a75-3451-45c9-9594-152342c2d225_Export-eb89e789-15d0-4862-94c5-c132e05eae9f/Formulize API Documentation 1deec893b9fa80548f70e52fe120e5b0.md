# Formulize API Documentation

## Table of Contents

1. Overview
2. Formula Specification
3. External Controls Specification
4. Visualization Specification
5. Binding Model
6. Examples

# 1. Overview

The core structure of a Formulize specification is as follows:

```jsx
Formulize.create(
  {
    formula: {
      /* Formula specification */
    },
    externalControls: [
      /* UI controls specification */
    ],
    visualizations: [
      /* Visualization specification */
    ],
  },
  "#container"
); // CSS selector for mounting
```

Each type of specification is explained in detail below, with particular focus on the bidirectional binding model.

## 2. Formula Specification

The formula component is the central element of the Formulize system, defining both the mathematical expression to be visualized and the variables that power it.

### Core Properties

| Property      | Type   | Required | Description                                                           |
| ------------- | ------ | -------- | --------------------------------------------------------------------- |
| `expression`  | String | Yes      | LaTeX representation of the formula                                   |
| `id`          | String | No       | Unique identifier for referencing this formula                        |
| `description` | String | No       | Human-readable description                                            |
| `displayMode` | String | No       | "block" (centered, default) or "inline" rendering                     |
| `variables`   | Object | Yes      | Definition of all variables used in the formula                       |
| `computation` | Object | No       | Specifies how dependent variables are calculated from other variables |

### Variable Properties

Each variable in the formula can now include binding information directly in its definition:

| Property      | Type   | Required               | Description                                          |
| ------------- | ------ | ---------------------- | ---------------------------------------------------- |
| `type`        | String | Yes                    | Variable type: "constant", "input", or "dependent"   |
| `value`       | Any    | Yes for constant/input | Initial/fixed value                                  |
| `dataType`    | String | No                     | Type of data: "scalar" (default), "vector", "matrix" |
| `dimensions`  | Array  | No                     | For vectors/matrices: [length] or [rows, cols]       |
| `units`       | String | No                     | Unit of measurement                                  |
| `label`       | String | No                     | Human-readable name                                  |
| `precision`   | Number | No                     | Decimal places to display                            |
| `description` | String | No                     | Longer explanation                                   |
| `range`       | Array  | No                     | Min and max allowed values [min, max]                |
| `step`        | Number | No                     | Increment size for discrete changes                  |
| `options`     | Array  | No                     | List of possible values (for categorical variables)  |
| `bind`        | Object | No                     | Local binding definition (new!)                      |

### Variable Types

### Input Variables

Values that can be modified by user interactions or components.

```jsx
"v": {
  type: "input",
  value: 5,
  units: "m/s",
  label: "velocity",
  range: [0, 20], // Constrain value between 0 and 20
  step: 0.1 // Allow changes in increments of 0.1
}
```

### Constant Variables

Fixed values that don't change.

```jsx
"m": {
  type: "constant",
  value: 1,
  units: "kg",
  label: "mass",
  precision: 2 // 1.00
}
```

### Dependent Variables

Values computed from other variables.

```jsx
"K": {
  type: "dependent",
  units: "J",
  label: "kinetic energy"
  // Computation is defined in the computation section
}

```

### Data Types

Variables can represent different kinds of mathematical quantities:

### Scalar (default)

Single numeric values.

```jsx
"temperature": {
  type: "input",
  dataType: "scalar", // Optional, this is the default
  value: 25,
  units: "°C"
}

```

### Vector

One-dimensional arrays of values.

```jsx
"position": {
  type: "input",
  dataType: "vector",
  value: [0, 0],
  dimensions: [2],
  label: "Position (x,y)"
}

```

### Matrix

Two-dimensional arrays of values.

```jsx
"kernel": {
  type: "input",
  dataType: "matrix",
  value: [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ],
  dimensions: [3, 3],
  label: "Sharpening Kernel"
}

```

### Categorical Variables

For variables with a fixed set of possible values:

```jsx
"filterType": {
  type: "input",
  value: "blur",
  options: ["blur", "sharpen", "edge", "emboss"],
  label: "Filter Type"
}

```

### Local Binding for Variables

The `bind` property allows direct binding to other components:

```jsx
"v": {
  type: "input",
  value: 5,
  units: "m/s",
  bind: {
    source: {
      component: "velocitySlider",
      property: "value"
    },
    direction: "bidirectional",
    transform: (value) => Math.round(value * 10) / 10  // Round to 1 decimal place
    reverseTransform: (value) =>
  }
}

```

### Example with Local Bindings

Here's a complete formula example with local bindings:

```jsx
formula: {
  expression: "K = \\frac{1}{2}mv^2",
  id: "kinetic-energy",
  description: "Kinetic energy equation",
  displayMode: "block",
  variables: {
    "m": {
      type: "constant",
      value: 1,
      units: "kg"
    },
    "v": {
      type: "input",
      value: 5,
      units: "m/s",
      range: [0, 20],
      step: 0.1,
      bind: {
        source: {
          component: "velocitySlider",
          property: "value"
        },
        direction: "bidirectional"
      }
    },
    "K": {
      type: "dependent",
      units: "J"
    }
  }
}

```

### Relationship with Global Bindings

Local variable bindings are functionally equivalent to global bindings but provide a more convenient syntax for simple cases. The following local binding:

```jsx
"v": {
  // ... other properties
  bind: {
    source: { component: "velocitySlider", property: "value" },
    direction: "bidirectional"
  }
}

```

Is equivalent to this global binding:

```jsx
bindings: [
  {
    source: { component: "velocitySlider", property: "value" },
    target: { component: "kinetic-energy", property: "v" },
    direction: "bidirectional",
  },
];
```

When both local and global bindings are specified for the same variable, the local binding takes precedence.

### Computation Specification

The computation specification defines how dependent variables are calculated from other variables.

### Properties

| Property   | Type   | Required                                 | Description                                                    |
| ---------- | ------ | ---------------------------------------- | -------------------------------------------------------------- |
| `engine`   | String | Yes                                      | Computational approach: "symbolic-algebra", "llm", or "manual" |
| `formula`  | String | Required for Symbol Algebra              | Symbolic algebra formula specification                         |
| `mappings` | Object | Required for manual, Optional for others | Variable computation expressions or functions                  |
| `apiKey`   | String | Required for LLM                         | API key for LLM-based computation                              |
| `model`    | String | Optional for LLM                         | Model to use for LLM computation (default: "gpt-4")            |

### Computation Engines

### Symbolic Algebra Engine

Uses mathematical analysis to automatically derive calculations between variables based on the formula.

```jsx
computation: {
  engine: "symbolic-algebra",
  formula: "{K} = 1/2 * {m} * {v} * {v}",
  // Optional mappings to override automatic derivation for specific variables
  mappings: {
    "K": function(vars) {
      return 0.5 * vars.m * Math.pow(vars.v, 2);
    }
  }
}
```

### LLM Engine

Uses large language models to generate computational logic by analyzing the formula.

```jsx
computation: {
  engine: "llm",
  apiKey: "your-openai-api-key",  // required for API access
  model: "gpt-4",  // optional model specification
  // Optional mappings to override automatic derivation
  mappings: {
    "K": function(vars) {
      return 0.5 * vars.m * Math.pow(vars.v, 2);
    }
  }
}
```

### Manual Engine

Uses explicit JavaScript functions defined by the author for variable computation.

```jsx
computation: {
  engine: "manual",
  mappings: {
    "K": function(vars) {
      return 0.5 * vars.m * Math.pow(vars.v, 2);
    },
    "m": function(vars) {
      return 2 * vars.K / Math.pow(vars.v, 2);
    },
    "v": function(vars) {
      return Math.sqrt(2 * vars.K / vars.m);
    }
  }
}
```

### Engine Selection Guidelines

- **Symbolic Algebra**: Best for mathematical expressions with well-defined relationships that can be solved symbolically.
- **LLM**: Ideal for complex relationships that may involve numerical methods or when the exact mathematical form is difficult to express.
- **Manual**: Provides the most control and flexibility. Necessary when calculations require custom logic, external libraries, or domain-specific algorithms.

## 3. External Controls Specification

External controls provide user interface elements to interact with and modify variable values. With the addition of local bindings, controls can now specify their connections to formula variables directly within their definition.

TODO: Custom components should be able to be integrated with our Formulize system

### Common Properties for All External Controls

| Property | Type   | Required | Description                                                       |
| -------- | ------ | -------- | ----------------------------------------------------------------- |
| `id`     | String | Yes      | Unique identifier for the control                                 |
| `type`   | String | Yes      | Type of external control                                          |
| `label`  | String | No       | Human-readable label for the control                              |
| `bind`   | Object | No       | Local binding specification defining variable relationship (new!) |

### Local Binding for Controls

Each control can directly specify which formula variable it connects to:

```jsx
{
  id: "velocitySlider",
  type: "slider",
  label: "Velocity (m/s)",
  min: 0,
  max: 10,
  step: 0.1,
  bind: {
    target: {
      component: "kinetic-energy",
      property: "v"
    },
    direction: "bidirectional",
    transform: (value) => Math.round(value * 10) / 10
  }
}

```

For backward compatibility, the simpler variable-only syntax is still supported:

```jsx
{
  id: "velocitySlider",
  type: "slider",
  label: "Velocity (m/s)",
  min: 0,
  max: 10,
  step: 0.1,
  bind: {
    variable: "v",  // Shorthand for binding to formula.v
    direction: "bidirectional"
  }
}

```

### Slider

Allows continuous numeric value selection within a specified range.

```jsx
{
  id: "velocitySlider",
  type: "slider",
  min: 0,
  max: 10,
  step: 0.1,
  orientation: "horizontal",
  showValue: true,
  label: "Adjust Velocity",
  bind: {
    variable: "v",
    direction: "bidirectional"
  }
}

```

| Slider-Specific Properties | Type    | Required | Description                            |
| -------------------------- | ------- | -------- | -------------------------------------- |
| `min`                      | Number  | Yes      | Minimum allowed value                  |
| `max`                      | Number  | Yes      | Maximum allowed value                  |
| `step`                     | Number  | No       | Increment size for value changes       |
| `orientation`              | String  | No       | "horizontal" or "vertical"             |
| `showValue`                | Boolean | No       | Display current value alongside slider |
|                            |         |          |                                        |

### Dropdown

Allows selection from a predefined list of options.

```jsx
{
  id: "filterDropdown",
  type: "dropdown",
  options: [
    { value: "blur", label: "Blur" },
    { value: "sharpen", label: "Sharpen" },
    { value: "edge", label: "Edge Detection" }
  ],
  placeholder: "Select Filter",
  label: "Image Processing Mode",
  bind: {
    variable: "imageProcessingMode",
    direction: "bidirectional"
  }
}

```

| **Dropdown Properties** | **Type** | **Required** | **Description**                                   |
| ----------------------- | -------- | ------------ | ------------------------------------------------- |
| `options`               | Array    | Yes          | List of selectable values for the target variable |
| `placeholder`           | String   | No           | Default display text                              |

### Radio Button

Allows selection of one option from a set of mutually exclusive choices.

```jsx
{
  id: "qualityRadio",
  type: "radio",
  options: [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" }
  ],
  layout: "horizontal",
  label: "Processing Quality",
  bind: {
    variable: "processingQuality",
    direction: "bidirectional"
  }
}

```

| **Radio Button Properties** | **Type** | **Required** | **Description**                                   |
| --------------------------- | -------- | ------------ | ------------------------------------------------- |
| `options`                   | Array    | Yes          | List of selectable values for the target variable |
| `layout`                    | String   | No           | "horizontal" or "vertical"                        |

### Checkbox

Provides a boolean toggle for enabling/disabling a feature.

```jsx
{
  id: "advancedCheckbox",
  type: "checkbox",
  label: "Advanced Mode",
  bind: {
    variable: "isAdvancedModeEnabled",
    direction: "bidirectional"
  }
}

```

| **Checkbox Properties** | **Type** | **Required** | **Description**                       |
| ----------------------- | -------- | ------------ | ------------------------------------- |
| `label`                 | String   | Yes          | Text describing the checkbox's effect |

### Button

Triggers an action that typically updates a variable or performs a specific operation.

### Button Definition

```jsx
{
  id: "resetButton",
  type: "button",
  label: "Reset Simulation",

  // Method 1: Using action for direct handling
  action: function(system) {
    // Reset multiple variables
    system.updateVariable("v", 0);
    system.updateVariable("t", 0);
  },

  // Method 2: Using local binding (alternative to global bindings)
  bind: {
    target: { component: "kinetic-energy", property: "v" },
    direction: "to-target",
    transform: () => 0,
    condition: (context) => context.event === "click"
  }
}

```

Button-Specific Properties

| Property | Type     | Required | Description                                               |
| -------- | -------- | -------- | --------------------------------------------------------- |
| `action` | Function | No\*     | Function to execute when button is clicked                |
| `label`  | String   | No       | Optional label to display on the button                   |
| `bind`   | Object   | No\*     | Local binding specification (alternative to using action) |

- Either `action` or `bind` should be specified, but not both in the same button.

### Implicit Properties

Buttons implicitly expose the following properties that can be referenced in global bindings:

| Property  | Type    | Description                                       |
| --------- | ------- | ------------------------------------------------- |
| `pressed` | Boolean | Becomes momentarily `true` when button is clicked |

### Using a Button with Global Bindings

Buttons can be connected to formula variables using global bindings that reference the implicit `pressed` property:

```jsx
bindings: [
  {
    source: { component: "resetButton", property: "pressed" },
    target: { component: "formula", property: "v" },
    direction: "to-target",
    transform: () => 0, // Reset to 0
    condition: (context) => context.event === "click",
  },
];
```

### Using a Button with Local Bindings

Alternatively, you can define bindings directly within the button using the `bind` property:

```jsx
{
  id: "resetButton",
  type: "button",
  label: "Reset Simulation",
  bind: {
    target: { component: "kinetic-energy", property: "v" },
    direction: "to-target",
    transform: () => 0,
    condition: (context) => context.event === "click"
  }
}

```

For multiple variable updates with local binding, you can use multiple buttons or combine with the `action` property for more complex logic.

## 4. Visualization Specification

Visualizations represent formula variables graphically through various types of charts, plots, and custom renderings. They can be interactive, allowing users to manipulate variables directly through the visualization.

## Plot2D

The Plot2D visualization component creates interactive 2D plots that visualize formula variables and allow users to directly manipulate these variables through dragging points or lines

Every Plot2D visualization must be linked to a formula component. This linkage can be established in two ways:

- **Implicit linkage**: If there is only one formula component in the system, Plot2D will automatically link to it
- **Explicit linkage**: If there are multiple formula components, you must specify which one to link to using the `formula` property

## Core Properties

| Property  | Type          | Required | Description                                                                  |
| --------- | ------------- | -------- | ---------------------------------------------------------------------------- |
| `id`      | String        | Yes      | Unique identifier for the visualization                                      |
| `type`    | String        | No       | Type of visualization (default: "plot2d")                                    |
| `formula` | String        | No       | ID of the formula component to link to (required if multiple formulas exist) |
| `title`   | String        | No       | Title displayed on the plot                                                  |
| `x`       | String/Object | Yes      | Formula variable for x-axis or configuration object                          |
| `y`       | String/Object | Yes      | Formula variable for y-axis or configuration object                          |
| `width`   | Number        | No       | Width in pixels (default: 400)                                               |
| `height`  | Number        | No       | Height in pixels (default: 300)                                              |
| `domain`  | Object        | No       | Custom axis ranges                                                           |
| `grid`    | Boolean       | No       | Show grid lines (default: true)                                              |
| `line`    | Object        | No       | Line configuration                                                           |
| `points`  | Array         | No       | Array of point specifications                                                |

| `hover`
\*\*\*\* | Object | No | Configures how hover position information is exposed for binding |

## Axis Configuration

Axes can be configured using a simple string reference to a formula variable:

```jsx
x: "v"; // Use formula variable "v" for x-axis
```

Or using a configuration object for more control:

```jsx
x: {
  variable: "v",         // Formula variable to plot
  domain: [0, 20],       // Custom axis range
  label: "Velocity (m/s)" // Axis label
}
```

## Line Configuration

The `line` property configures the main function curve:

```jsx
line: {
  color: "blue",          // Line color
  width: 2,               // Line width
  style: "solid",         // "solid", "dashed", "dotted"
  label: "Energy curve",  // Optional label for the legend

  // Make the line draggable
  draggable: {
    bind: "c",            // Dragging updates variable c in formula
    axis: "y",            // Only vertical dragging ("x", "y", or "xy")
    mode: "translate",    // How dragging affects the line: "translate", "scale"
    domain: [-10, 10]     // Limit variable range
  }
}

```

## Point Specification

Points should have at least one fixed coordinate and a maximum of one independent quantities. The `points` property is an array of point objects:

```jsx
points: [
  // 1. Fixed x and fixed y coordinates (reference point)
  {
    x: 5, // Fixed x-coordinate value
    y: 10, // Fixed y-coordinate value
    color: "black",
    size: 6,
    shape: "circle", // "circle", "square", "triangle", etc.
  },

  // 2. Fixed x with y calculated from formula (vertical guide)
  {
    x: 5, // Fixed x-coordinate value
    y: "K", // y-coordinate calculated from formula
    color: "blue",
    size: 6,
  },

  // 3. Calculated x with fixed y (horizontal guide)
  {
    x: "v", // x-coordinate calculated from formula
    y: 10, // Fixed y-coordinate value
    color: "green",
    size: 6,
  },
];
```

## Hover Behavior

The `hover` property exposes cursor position data that can be bound to other components.

```jsx
hover: {
  enabled: true,           // Whether hover tracking is enabled (default: true)
  expose: ["x", "y"],      // Which coordinates to expose (default: both)

  // Visual feedback options (all optional)
  feedback: {
    showCrosshair: true,   // Show guide lines
    snapToPoints: true,   // Snap to nearest data point
    snapThreshold: 20      // Distance threshold for snapping (pixels)
  }
}
```

# LinearAlgebraPlot2D

The `LinearAlgebraPlot2D` visualization component creates interactive visualizations of 2D vectors and matrix transformations. It specializes in visualizing linear algebra concepts including:

- Individual vectors in 2D space
- Matrix column vectors
- Matrix transformations of vectors
- Vector relationships with connectors

Every LinearAlgebraPlot2D must be linked to a formula component containing the necessary vector and matrix variables.

## Core Properties

| Property        | Type    | Required | Description                                                                  |
| --------------- | ------- | -------- | ---------------------------------------------------------------------------- |
| `id`            | String  | Yes      | Unique identifier for the visualization                                      |
| `type`          | String  | Yes      | Set to "linearAlgebraPlot2D"                                                 |
| `formula`       | String  | No       | ID of the formula component to link to (required if multiple formulas exist) |
| `title`         | String  | No       | Title displayed with the visualization                                       |
| `width`         | Number  | No       | Width in pixels (default: 400)                                               |
| `height`        | Number  | No       | Height in pixels (default: 400)                                              |
| `domain`        | Object  | No       | Custom axis ranges (e.g., `{x: [0, 5], y: [0, 5]}`)                          |
| `axes`          | Object  | No       | Axis configuration                                                           |
| `grid`          | Boolean | No       | Show grid lines (default: true)                                              |
| `origin`        | Object  | No       | Origin configuration (default: `{visible: true}`)                            |
| `vectors`       | Array   | No       | Array of vector specifications                                               |
| `matrixColumns` | Object  | No       | Optional configuration for displaying matrix columns as vectors              |
| `annotations`   | Array   | No       | Text or visual annotations                                                   |

## Vector Specification

Each vector specification can include the following properties:

| Property          | Type           | Required | Description                                                            |
| ----------------- | -------------- | -------- | ---------------------------------------------------------------------- |
| `variable`        | String         | No\*     | Reference to formula vector variable (dataType: "vector")              |
| `values`          | Array          | No\*     | Direct specification of vector values [x, y]                           |
| `id`              | String         | No       | Identifier for this vector (to reference from connectors)              |
| `label`           | String         | No       | Display label for the vector                                           |
| `color`           | String         | No       | Vector color (default: auto-assigned)                                  |
| `thickness`       | Number         | No       | Line thickness (default: 2)                                            |
| `basePoint`       | Array/String   | No       | Starting point [x, y] or reference to another vector (default: [0, 0]) |
| `showCoordinates` | Boolean        | No       | Show vector coordinates (default: false)                               |
| `scale`           | Number         | No       | Scale factor to apply to vector (default: 1)                           |
| `arrowStyle`      | String         | No       | "default", "thin", "bold", "none"                                      |
| `draggable`       | Boolean/Object | No       | Enable dragging (default: false) or dragging configuration             |
| `connector`       | Object         | No       | Connection to another vector                                           |

- Either `variable` or `values` must be specified.

When a vector references a formula variable with the `variable` property, dragging the vector will automatically update that formula variable. The `draggable` property can be set to `true` to enable this default behavior, or can be configured as an object for more control.

### Draggable Configuration

When more control over dragging behavior is needed:

| Property    | Type     | Required | Description                                             |
| ----------- | -------- | -------- | ------------------------------------------------------- |
| `axis`      | String   | No       | Restrict dragging to "x", "y", or "both" (default)      |
| `transform` | Function | No       | Transform function for cleaning values (e.g., rounding) |

### Connector Configuration

| Property | Type   | Required | Description                              |
| -------- | ------ | -------- | ---------------------------------------- |
| `to`     | String | Yes      | ID of vector to connect to               |
| `style`  | String | No       | Line style ("solid", "dashed", "dotted") |
| `color`  | String | No       | Line color                               |

## Matrix Column Vectors

The matrix columns can be automatically displayed as vectors without defining each one manually. This is completely optional - you can always define vectors directly if you prefer:

| Property                  | Type   | Required | Description                                            |
| ------------------------- | ------ | -------- | ------------------------------------------------------ |
| `matrixColumns`           | Object | No       | Configuration for displaying matrix columns as vectors |
| `matrixColumns.variable`  | String | Yes      | Reference to formula matrix variable                   |
| `matrixColumns.colors`    | Array  | No       | Colors for column vectors (e.g., ["blue", "green"])    |
| `matrixColumns.labels`    | Array  | No       | Labels for column vectors (e.g., ["a₁", "a₂"])         |
| `matrixColumns.thickness` | Number | No       | Line thickness (default: 2)                            |
| `matrixColumns.basePoint` | Array  | No       | Starting point (default: [0, 0])                       |

## Annotation Specification

Annotations allow you to display additional information within the plot:

| Property    | Type            | Required | Description                                          |
| ----------- | --------------- | -------- | ---------------------------------------------------- |
| `type`      | String          | Yes      | "text", "matrix", "vector", "line"                   |
| `position`  | Array           | Yes      | [x, y] position in plot coordinates                  |
| `content`   | String/Function | No\*     | Text content or template (for text type)             |
| `variable`  | String          | No\*     | Formula variable reference (for matrix/vector types) |
| `label`     | String          | No       | Label to display before the value                    |
| `precision` | Number          | No       | Number of decimal places to show                     |
| `color`     | String          | No       | Text/element color                                   |
| `fontSize`  | Number          | No       | Text size                                            |

- Required for respective annotation types.

### Matrix Annotation Properties

| Property           | Type    | Required | Description                   |
| ------------------ | ------- | -------- | ----------------------------- |
| `highlightColumns` | Boolean | No       | Use colors for column vectors |
| `columnColors`     | Array   | No       | Colors for each column        |

## Example: Matrix-Vector Multiplication

This example visualizes a matrix-vector multiplication, showing:

- The original vector v (which can be dragged)
- The matrix A represented by its column vectors
- The resulting vector Av = A·v

```jsx
Formulize.create(
  {
    formula: {
      id: "matrix-vector-mult",
      expression: "A\\mathbf{v} = \\mathbf{Av}",
      variables: {
        A: {
          type: "input",
          dataType: "matrix",
          value: [
            [1.76, 0.32],
            [0.63, 1.07],
          ],
          dimensions: [2, 2],
          label: "A",
        },
        v: {
          type: "input",
          dataType: "vector",
          value: [1.41, 2.09],
          dimensions: [2],
          label: "v",
        },
        Av: {
          type: "dependent",
          dataType: "vector",
          dimensions: [2],
          label: "Av",
        },
      },
      computation: {
        engine: "manual",
        mappings: {
          Av: function (vars) {
            const A = vars.A;
            const v = vars.v;
            return [
              A[0][0] * v[0] + A[0][1] * v[1],
              A[1][0] * v[0] + A[1][1] * v[1],
            ];
          },
        },
      },
    },

    visualizations: [
      {
        id: "matrix-vector-mult-viz",
        type: "linearAlgebraPlot2D",
        formula: "matrix-vector-mult",

        domain: {
          x: [0, 5],
          y: [0, 5],
        },

        // Optional: Auto-display matrix columns as vectors
        matrixColumns: {
          variable: "A",
          colors: ["blue", "green"],
          labels: ["a₁", "a₂"],
          thickness: 3,
        },

        vectors: [
          // Input vector v
          {
            variable: "v", // Bound to formula variable "v"
            color: "red",
            label: "v",
            thickness: 2,
            draggable: true, // Automatically updates formula variable "v"
          },

          // Result vector Av
          {
            variable: "Av",
            color: "orange",
            label: "Av",
            thickness: 2,

            // Show connection line from v to Av
            connector: {
              to: "v",
              style: "dotted",
              color: "gray",
            },
          },

          // Example of a vector not at origin
          {
            values: [2, 1], // Directly specified vector values
            basePoint: [2, 2], // Starting from point (2,2)
            color: "purple",
            label: "Fixed vector",
          },
        ],

        // Display matrix and vector values
        annotations: [
          {
            type: "matrix",
            position: [3.7, 3.7],
            variable: "A",
            label: "A = ",
            precision: 2,
          },
          {
            type: "vector",
            position: [3.7, 2.5],
            variable: "v",
            label: "v = ",
            precision: 2,
            color: "red",
          },
          {
            type: "vector",
            position: [3.7, 1.7],
            variable: "Av",
            label: "Av = ",
            precision: 2,
            color: "orange",
          },
        ],
      },
    ],
  },
  "#matrix-vector-container"
);
```

# Custom Visualization (work in progress)

The `Custom` visualization component provides a flexible way to create entirely custom visualizations beyond the built-in types. It allows you to define your own properties and rendering logic while still maintaining integration with the Formulize binding system.

## Core Properties

| Property     | Type     | Required | Description                                                                  |
| ------------ | -------- | -------- | ---------------------------------------------------------------------------- |
| `id`         | String   | Yes      | Unique identifier for the visualization                                      |
| `type`       | String   | Yes      | Set to "custom"                                                              |
| `formula`    | String   | No       | ID of the formula component to link to (required if multiple formulas exist) |
| `properties` | Object   | Yes      | Custom properties definition (see below)                                     |
| `renderer`   | Function | Yes      | Function that returns HTML/SVG content based on properties                   |
| `width`      | Number   | No       | Width in pixels (default: 400)                                               |
| `height`     | Number   | No       | Height in pixels (default: 300)                                              |
| `className`  | String   | No       | CSS class to apply to the root element                                       |
| `style`      | Object   | No       | Inline styles to apply to the root element                                   |
| `events`     | Object   | No       | Custom event handlers (see below)                                            |

## Properties Definition

The `properties` object defines the data schema for your custom visualization:

```jsx
properties: {
  "propertyName": {
    type: "string",       // Data type: "string", "number", "boolean", "array", "object", etc.
    value: "initialValue", // Initial value
    required: true,       // Whether the property is required
    onChange: function(newValue, oldValue) {
      // Optional callback when property changes
    }
  },
  // More properties...
}

```

Each property definition can include:

| Property   | Type     | Required | Description                                       |
| ---------- | -------- | -------- | ------------------------------------------------- |
| `type`     | String   | Yes      | Data type of the property                         |
| `value`    | Any      | No       | Initial value                                     |
| `required` | Boolean  | No       | Whether the property is required (default: false) |
| `onChange` | Function | No       | Callback when property changes                    |
| `bind`     | Object   | No       | Local binding definition (like other components)  |

## Renderer Function

The `renderer` function receives the current property values and should return HTML/SVG content:

```jsx
renderer: function(props, context) {
  // props contains all the current property values
  // context provides additional information about the Formulize system

  // Return HTML/SVG content as a string
  return `<div class="custom-visualization">
    <span>${props.text}</span>
    <svg width="${props.width}" height="${props.height}">
      <!-- SVG content -->
    </svg>
  </div>`;
}

```

The context object provides:

| Property    | Description                               |
| ----------- | ----------------------------------------- |
| `formula`   | Reference to the linked formula component |
| `container` | DOM element containing the visualization  |
| `width`     | Container width                           |
| `height`    | Container height                          |
| `system`    | Reference to the Formulize system         |

## Event Handlers

The `events` object allows you to define custom event handlers:

```jsx
events: {
  "click": function(event, props, context) {
    // Handle click event
  },
  "mousemove": function(event, props, context) {
    // Handle mouse movement
  }
  // Other DOM events...
}

```

Event handler functions receive:

1. The DOM event
2. Current property values
3. The context object

## Update Lifecycle

Custom visualizations have a lifecycle for property changes:

1. Property change triggered (via binding or direct update)
2. Property `onChange` handlers called (if defined)
3. `beforeUpdate` callback called (if defined)
4. Renderer function called with new property values
5. DOM updated with new content
6. `afterUpdate` callback called (if defined)

You can define lifecycle callbacks:

```jsx
beforeUpdate: function(newProps, oldProps, context) {
  // Called before re-rendering with new properties
  // Return false to prevent update
},
afterUpdate: function(props, context) {
  // Called after DOM has been updated
}

```

## Example: Custom Formula Value Display

```jsx
{
  id: "valueDisplay",
  type: "custom",
  formula: "quadratic-formula",
  properties: {
    "title": { type: "string", value: "Formula Values" },
    "showVariableNames": { type: "boolean", value: true },
    "precision": { type: "number", value: 2 },
    "variables": {
      type: "array",
      value: ["a", "b", "c", "x1", "x2"]
    }
  },
  width: 300,
  height: 200,
  renderer: function(props, context) {
    const formula = context.formula;
    const variables = props.variables;

    let html = `<div class="value-display">
      <h3>${props.title}</h3>
      <table>`;

    variables.forEach(varName => {
      const value = formula.getVariable(varName);
      const formatted = typeof value === 'number'
        ? value.toFixed(props.precision)
        : value;

      html += `<tr>
        ${props.showVariableNames ? `<td>${varName}:</td>` : ''}
        <td>${formatted}</td>
      </tr>`;
    });

    html += `</table></div>`;
    return html;
  },
  style: {
    fontFamily: "Arial, sans-serif",
    border: "1px solid #ccc",
    padding: "10px",
    borderRadius: "5px"
  }
}

```

## Example: Interactive Heat Map

```jsx
{
  id: "heatMap",
  type: "custom",
  formula: "matrix-formula",
  properties: {
    "matrix": {
      type: "matrix",
      value: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    },
    "colorScale": {
      type: "array",
      value: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"]
    },
    "cellSize": { type: "number", value: 40 },
    "interactive": { type: "boolean", value: true }
  },
  renderer: function(props, context) {
    const matrix = props.matrix;
    const rows = matrix.length;
    const cols = matrix[0].length;
    const cellSize = props.cellSize;

    // Find min/max for color scaling
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        min = Math.min(min, matrix[i][j]);
        max = Math.max(max, matrix[i][j]);
      }
    }

    // Color scale function
    const getColor = (value) => {
      const normalized = (value - min) / (max - min || 1);
      const index = Math.min(
        Math.floor(normalized * props.colorScale.length),
        props.colorScale.length - 1
      );
      return props.colorScale[index];
    };

    // Generate SVG
    let svg = `<svg width="${cols * cellSize}" height="${rows * cellSize}">`;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = matrix[i][j];
        const x = j * cellSize;
        const y = i * cellSize;

        svg += `<rect
          x="${x}"
          y="${y}"
          width="${cellSize}"
          height="${cellSize}"
          fill="${getColor(value)}"
          stroke="#fff"
          data-row="${i}"
          data-col="${j}"
          data-value="${value}"
        />`;

        // Add text label
        svg += `<text
          x="${x + cellSize/2}"
          y="${y + cellSize/2}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="${value > (min + max) / 2 ? 'white' : 'black'}"
          font-size="${cellSize/3}px"
        >${value.toFixed(1)}</text>`;
      }
    }

    svg += `</svg>`;
    return svg;
  },
  events: {
    "click": function(event, props, context) {
      if (!props.interactive) return;

      // Only handle rect clicks
      if (event.target.tagName !== 'rect') return;

      const row = parseInt(event.target.getAttribute('data-row'));
      const col = parseInt(event.target.getAttribute('data-col'));

      // Update the matrix value (example)
      const newMatrix = [...props.matrix];
      newMatrix[row][col] += 1;

      // Update the property
      context.system.updateProperty(context.id, 'matrix', newMatrix);
    }
  }
}

```

## Connecting to Formula Variables

Custom visualizations can connect to formula variables in three ways:

### 1. Direct Formula Access

```jsx
renderer: function(props, context) {
  const formula = context.formula;
  const xValue = formula.getVariable('x');
  // Use xValue in rendering
}

```

### 2. Property Bindings (Local)

```jsx
{
  id: "customViz",
  type: "custom",
  properties: {
    "xValue": { type: "number", value: 0 }
  },
  bind: {
    source: { component: "quadratic-formula", property: "x" },
    target: { component: "customViz", property: "xValue" },
    direction: "to-target"
  },
  renderer: function(props) {
    // Use props.xValue which will be updated automatically
    return `<div>x = ${props.xValue}</div>`;
  }
}

```

### 3. Global Bindings

```jsx
bindings: [
  {
    source: { component: "quadratic-formula", property: "x" },
    target: { component: "customViz", property: "xValue" },
    direction: "to-target",
  },
];
```

## Best Practices

1. **Separate Logic from Rendering**: Keep computation logic in property update handlers and focus the renderer function on creating the visualization.
2. **Cache Complex Calculations**: For performance, cache calculations that don't need to be recomputed on every render.
3. **Handle Responsiveness**: Use the container width/height to make your visualization responsive.
4. **Clean Up Resources**: If your visualization uses external libraries or creates resources, clean them up when the component is destroyed:

```jsx
destroy: function(context) {
  // Clean up resources, event listeners, etc.
  if (context.chart) {
    context.chart.dispose();
    context.chart = null;
  }
}

```

1. **Optimize Property Updates**: Only trigger re-renders when necessary:

```jsx
shouldUpdate: function(newProps, oldProps) {
  // Only update if specific properties have changed
  return newProps.data !== oldProps.data ||
         newProps.width !== oldProps.width;
}

```

## 6. Bindings Specification

The Formulize bindings specification provides a centralized way to connect variables and properties between different components in an interactive formula visualization. While components can define local bindings (as shown in previous sections), the global `bindings` array establishes all relationships in one place, making complex interaction networks easier to understand and maintain.

```jsx
bindings: [
  {
    source: { component: "componentId", property: "propertyPath" },
    target: { component: "componentId", property: "propertyPath" },
    direction: "bidirectional", // "to-target" or "bidirectional"
    transform: (value) => transformedValue,
    reverseTransform: (value) => transformedValue, // for bidirectional
    condition: (context) => boolean, // Optional condition for when binding is active
  },
  // More bindings...
];
```

### Binding Properties

| Property           | Type     | Required | Description                                                      |
| ------------------ | -------- | -------- | ---------------------------------------------------------------- |
| `source`           | Object   | Yes      | Specifies the source component and property                      |
| `target`           | Object   | Yes      | Specifies the target component and property                      |
| `direction`        | String   | No       | How data flows: "bidirectional" (default) or "to-target"         |
| `transform`        | Function | No       | Transform function for source→target updates                     |
| `reverseTransform` | Function | No       | Transform function for target→source updates (for bidirectional) |
| `condition`        | Function | No       | Function that determines if binding is active                    |

### Component Property Access

Each component type in Formulize has its own way of defining properties. The bindings system uses a consistent path notation to reference these properties regardless of how they're defined.

### Formula Component Properties

The formula component properties map to variables defined in the `variables` section:

```jsx
// Component definition
formula: {
  expression: "K = \\frac{1}{2} m v^2",
  id: "kinetic-energy",
  variables: {
    "m": { type: "constant", value: 1, units: "kg" },
    "v": { type: "input", value: 5, units: "m/s" },
    "K": { type: "dependent", units: "J" }
  }
}

// Binding reference
source: { component: "kinetic-energy", property: "v" }

```

### External Control Properties

Controls have implicit properties based on their control type:

| Control Type | Primary Property | Other Properties     |
| ------------ | ---------------- | -------------------- |
| `slider`     | `value`          | `min`, `max`, `step` |
| `dropdown`   | `selectedOption` | `options`            |
| `checkbox`   | `checked`        | `label`              |
| `button`     | `pressed`        | `label`              |
| `radio`      | `selectedValue`  | `options`            |

```jsx
// Component definition
{
  id: "velocitySlider",
  type: "slider",
  min: 0,
  max: 20,
  step: 0.1
  // "value" property is implicit
}

// Binding reference
target: { component: "velocitySlider", property: "value" }

```

### Visualization Properties

Visualizations have component-specific properties based on their visualization type:

### Plot2D Visualization

| Property Path    | Description                        |
| ---------------- | ---------------------------------- |
| `cursorPosition` | {x, y} coordinates of cursor       |
| `zoomLevel`      | Current zoom factor                |
| `selectionRange` | Current selection area coordinates |
| `points[0].x`    | X-coordinate of first point        |
| `points[0].y`    | Y-coordinate of first point        |
| `line.data`      | Data array for a line              |

```jsx
// Component definition
{
  id: "energyPlot",
  type: "plot2d",
  x: { variable: "v", domain: [0, 20] },
  y: { variable: "K", domain: [0, 500] },
  points: [
    { x: "v", y: "K", draggable: { bind: "v", axis: "x" } }
  ]
}

// Binding reference
source: { component: "energyPlot", property: "points[0].x" }

```

### Custom Visualization

Custom visualizations can expose any properties they need:

```jsx
// Component definition
{
  id: "valueDisplay",
  type: "custom",
  properties: {
    "text": { type: "string", value: "" }
  },
  renderer: function(props) {
    return `<div>${props.text}</div>`;
  }
}

// Binding reference
target: { component: "valueDisplay", property: "text" }

```

### Property Path Notation

The bindings system uses a dot notation to access nested properties:

```
"value"                  // Top-level property
"points[0].x"            // Array element property
"cursorPosition.x"       // Object property

```

### Local vs. Global Bindings

Formulize supports two ways of defining bindings:

### 1. Local Bindings

Define bindings directly within component definitions:

```jsx
// In a formula variable
"v": {
  type: "input",
  value: 5,
  bind: {
    source: { component: "velocitySlider", property: "value" },
    direction: "bidirectional"
  }
}

// In an external control
{
  id: "velocitySlider",
  type: "slider",
  min: 0,
  max: 20,
  bind: {
    target: { component: "kinetic-energy", property: "v" },
    direction: "bidirectional"
  }
}

// In a visualization point
points: [
  {
    x: "v",
    y: "K",
    draggable: {
      bind: "v",  // Shorthand for binding to formula variable v
      axis: "x"
    }
  }
]

```

### 2. Global Bindings

Define all bindings in a central bindings array:

```jsx
bindings: [
  {
    source: { component: "velocitySlider", property: "value" },
    target: { component: "kinetic-energy", property: "v" },
    direction: "bidirectional",
  },
];
```

Local and global bindings can be used together, with local bindings taking precedence when there are conflicts.

### Example: Binding a Slider to a Formula Variable

```jsx
// Global binding approach
{
  source: { component: "velocitySlider", property: "value" },
  target: { component: "formula", property: "v" },
  direction: "bidirectional"
}

// Local binding approach (in slider definition)
{
  id: "velocitySlider",
  type: "slider",
  min: 0,
  max: 20,
  bind: {
    target: { component: "formula", property: "v" },
    direction: "bidirectional"
  }
}

// Local binding approach (in formula definition)
"v": {
  type: "input",
  value: 5,
  bind: {
    source: { component: "velocitySlider", property: "value" },
    direction: "bidirectional"
  }
}

```

### Example: Binding a Draggable Point to a Formula Variable

```jsx
// Global binding approach
{
  source: { component: "energyPlot", property: "points[0].x" },
  target: { component: "formula", property: "v" },
  direction: "bidirectional",
  transform: (x) => Math.round(x * 10) / 10 // Round to 1 decimal place
}

// Local binding approach (in visualization)
points: [
  {
    x: "v",
    y: "K",
    draggable: {
      bind: "v",
      axis: "x",
      transform: (x) => Math.round(x * 10) / 10
    }
  }
]

```

### Displaying a Formula Result

```jsx
// Global binding approach
{
  source: { component: "formula", property: "K" },
  target: { component: "valueDisplay", property: "text" },
  direction: "to-target",
  transform: (value) => `Kinetic Energy: ${value.toFixed(2)} J`
}

// Local binding approach (in custom component)
{
  id: "valueDisplay",
  type: "custom",
  properties: {
    "text": { type: "string", value: "" }
  },
  bind: {
    source: { component: "formula", property: "K" },
    direction: "to-target",
    transform: (value) => `Kinetic Energy: ${value.toFixed(2)} J`
  },
  renderer: function(props) {
    return `<div>${props.text}</div>`;
  }
}

```

### Conditional Binding

```jsx
{
  source: { component: "energyPlot", property: "selectionRange" },
  target: { component: "formula", property: "v" },
  direction: "to-target",
  transform: (range) => (range.max + range.min) / 2, // Use midpoint of selection
  condition: (context) => context.mode === "selection-mode"
}

```

## Complete Example

Here's a complete example showing how both local and global bindings connect components in a kinetic energy visualization:

```jsx
Formulize.create(
  {
    formula: {
      expression: "K = \\frac{1}{2}mv^2",
      id: "kinetic-energy",
      displayMode: "block",
      variables: {
        m: {
          type: "constant",
          value: 1,
          units: "kg",
        },
        v: {
          type: "input",
          value: 5,
          units: "m/s",
          // Local binding for v variable
          bind: {
            source: { component: "velocitySlider", property: "value" },
            direction: "bidirectional",
          },
        },
        K: {
          type: "dependent",
          units: "J",
        },
      },
      computation: {
        engine: "manual",
        mappings: {
          K: function (vars) {
            return 0.5 * vars.m * Math.pow(vars.v, 2);
          },
        },
      },
    },

    externalControls: [
      {
        id: "velocitySlider",
        type: "slider",
        min: 0,
        max: 20,
        step: 0.1,
        label: "Velocity",
        // No explicit binding needed here since it's defined in the formula
      },
      {
        id: "massSlider",
        type: "slider",
        min: 0.1,
        max: 10,
        step: 0.1,
        label: "Mass",
        // Local binding in the control
        bind: {
          target: { component: "kinetic-energy", property: "m" },
          direction: "bidirectional",
        },
      },
      {
        id: "resetButton",
        type: "button",
        label: "Reset Values",
      },
    ],

    visualizations: [
      {
        id: "energyPlot",
        type: "plot2d",
        x: { variable: "v", domain: [0, 20], label: "Velocity (m/s)" },
        y: { variable: "K", domain: [0, 500], label: "Energy (J)" },
        line: { color: "blue", width: 2 },
        points: [
          {
            x: "v",
            y: "K",
            color: "red",
            size: 8,
            // Local binding in the point
            draggable: {
              bind: "v",
              axis: "x",
              domain: [0, 20],
            },
          },
        ],
      },
      {
        id: "valueDisplay",
        type: "custom",
        renderer: function (props) {
          return `<div>${props.text}</div>`;
        },
      },
    ],

    // Global bindings for cases not covered by local bindings
    bindings: [
      // Connect formula kinetic energy result to value display
      {
        source: { component: "kinetic-energy", property: "K" },
        target: { component: "valueDisplay", property: "text" },
        direction: "to-target",
        transform: (value) => `Kinetic Energy: ${value.toFixed(2)} J`,
      },

      // Connect reset button to formula variables
      {
        source: { component: "resetButton", property: "pressed" },
        target: { component: "kinetic-energy", property: "v" },
        direction: "to-target",
        transform: () => 5, // Reset to 5 m/s
        condition: (context) => context.event === "click",
      },
      {
        source: { component: "resetButton", property: "pressed" },
        target: { component: "kinetic-energy", property: "m" },
        direction: "to-target",
        transform: () => 1, // Reset to 1 kg
        condition: (context) => context.event === "click",
      },
    ],
  },
  "#container"
);
```

This example demonstrates how local bindings can be used alongside global bindings to create a complete interactive visualization. Local bindings make component relationships clearer at the point of definition, while global bindings provide flexibility for more complex relationships that span multiple components.

## 7. Examples

### Image Augmentation

Given any provided formula, Formulize would be able to connect the formula variables to user created functions that automate or show various displays for interactivity. For instance, take the case of using the interactive kernel formula to showcase it’s affects on image outputs.

![image.png](Formulize%20API%20Documentation%201deec893b9fa80548f70e52fe120e5b0/image.png)

```c
Formulize.create({
  // Define the formula with kernel variables
  formula: {
    id: "kernel-formula",
    // Mathematical representation (LaTeX)
    expression: "K = \\begin{bmatrix} k_{11} & k_{12} & k_{13} \\\\ k_{21} & k_{22} & k_{23} \\\\ k_{31} & k_{32} & k_{33} \\end{bmatrix}",
    variables: {
      // Individual kernel elements as input variables
      "k_11": { type: "input", value: -2 },
      "k_12": { type: "input", value: -1 },
      "k_13": { type: "input", value: 0 },
      "k_21": { type: "input", value: -1 },
      "k_22": { type: "input", value: 1 },
      "k_23": { type: "input", value: 1 },
      "k_31": { type: "input", value: 0 },
      "k_32": { type: "input", value: 1 },
      "k_33": { type: "input", value: 2 },
      "kernel": {
        type: "dependent",
        dataType: "matrix",
        dimensions: [3, 3]
      }
    },

    computation: {
      engine: "manual",
      mappings: {
        "kernel": function(vars) {
          return [
            [vars.k_11, vars.k_12, vars.k_13],
            [vars.k_21, vars.k_22, vars.k_23],
            [vars.k_31, vars.k_32, vars.k_33]
          ];
        }
      }
    }
  },

  // Image processing component
  visualizations: [{
    id: "imageProcessor",
    type: "custom",
    properties: {
      "kernel": { type: "matrix", value: [[0,0,0], [0,1,0], [0,0,0]] },
      "inputImage": { type: "string", value: "image.jpg" }
    },
    // Apply Kernel to Image with a specifically
	  // written apple Kernel to Image function
	  // THERE WILL BE A HOOK CREATED SIMILAR TO USE EFFECT
	  // SUCH THAT THE FUNCTION results happen in response to real time
	  // interactions with the kernel formula display
    // Define the renderer function that will be called when properties change
    renderer: function(props) {
      // In a real implementation, this would process the image with the kernel
      const processedImageSrc = applyKernelToImage(props.inputImage, props.kernel);
      return `<div>
                <img src="${processedImageSrc}" alt="Processed image" />
                <div>Applied kernel: ${JSON.stringify(props.kernel)}</div>
              </div>`;
    }
  }],

  // Connect formula to image processor using an array of bindings
  bindings: [
    {
      source: { component: "kernel-formula", property: "kernel" },
      target: { component: "imageProcessor", property: "kernel" },
      direction: "to-target"
    }
  ]
}, "#image-processor-container");
```

Interacting with the formula itself, the user would be able to update the variables which will update the outputs of a custom function that is in charge of a custom rendering logic for image or displays that are outside of the graph or canvas environment.

## Kinetic Energy Plot

```jsx
{
  id: "energyPlot",
  // type: "plot2d" is default and can be omitted
  // formula: "kinetic-energy" is implicit if only one formula exists
  title: "Kinetic Energy vs. Velocity",
  x: {
    variable: "v",
    domain: [0, 20],
    label: "Velocity (m/s)"
  },
  y: {
    variable: "K",
    domain: [0, 500],
    label: "Energy (J)"
  },

  // Main curve showing K = 0.5*m*v^2
  line: {
    color: "blue",
    width: 2
  },

  points: [
    // Interactive point with horizontal dragging only
    {
      x: "v",       // x-coordinate bound to input_v variable
      y: "K",             // y-coordinate calculated from the function
      color: "red",
      size: 8,
      draggable: {
        bind: "v",  // Dragging updates input_v variable
        axis: "x",        // Only horizontal dragging
        domain: [0, 20]   // Constrain to valid range
      }
    },

    // Fixed x-coordinate reference point
    {
      x: 10,              // Fixed x-coordinate at v=10
      y: "K",             // y-coordinate calculated from formula
      color: "green",
      size: 6
    }
  ]
}
```

### Example 2: Sine Wave with Draggable Line

![image.png](Formulize%20API%20Documentation%201deec893b9fa80548f70e52fe120e5b0/image%201.png)

```jsx
Formulize.create(
  {
    formula: {
      expression: "y = a \\sin(\\theta)",
      id: "sine-formula",
      variables: {
        a: {
          type: "input",
          value: 1.3,
          range: [0.1, 2.0],
        },
        theta: {
          type: "input",
          value: 0,
          range: [0, 13],
        },
        y: {
          type: "dependent",
        },
      },
      computation: {
        engine: "manual",
        mappings: {
          y: function (vars) {
            return vars.a * Math.sin(vars.theta);
          },
        },
      },
    },

    // Create the visualization
    visualizations: [
      {
        id: "sine-plot",
        type: "plot2d",
        formula: "sine-formula", // Reference to the formula component
        x: {
          variable: "theta", // Use theta variable from formula for x-axis
          domain: [0, 13],
          label: "θ",
        },
        y: {
          variable: "y", // Use y variable from formula for y-axis
          domain: [-2.0, 2.0],
          label: "y",
        },
        grid: true,

        // Red sine curve that can be dragged vertically
        line: {
          color: "red",
          width: 2,

          draggable: {
            bind: "a", // Connects to the amplitude variable
            axis: "y", // Only allows vertical dragging
            mode: "scale", // Scales the curve when dragged
          },
        },
      },
    ],
  },
  "#sine-wave-container"
);
```
