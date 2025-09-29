export const sinTheta = `const config = {
  formulas: [
    {
      formulaId: "sin-theta",
      latex: "y = c \\\\cdot \\\\sin(\\\\theta)",
      expression: "{y} = {c} * sin({\\\\theta})"
    }
  ],
  variables: {
    y: {
      type: "dependent",
      name: "y-value",
      precision: 2,
    },
    c: {
      type: "input",
      value: 1,
      range: [-3, 3],
      step: 0.1,
      precision: 1
    },
    "\\\\theta": {
      type: "constant",
      value: 0,
      range: [-2 * Math.PI, 2 * Math.PI],
      step: 0.01,
      name: "x",
      latexDisplay: "value",
      labelDisplay: "name"
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },

  visualizations: [
    {
      type: "plot2d",
      xAxisVar: "\\\\theta",
      xRange: [-2 * Math.PI, 2 * Math.PI],
      yAxisVar: "y",
      yRange: [-1.5, 1.5],
      width: 600,
      height: 600,
      lines: [
        {
          name: "sin(θ)",
        }
      ]
    }
  ]
};`;
