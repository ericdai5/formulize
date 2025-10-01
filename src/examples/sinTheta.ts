export const sinTheta = `const config = {
  formulas: [
    {
      formulaId: "sin-theta",
      latex: "y = c \\\\sin(\\\\theta)",
      expression: "{y} = {c} * sin({\\\\theta})"
    }
  ],
  variables: {
    y: {
      type: "dependent",
      precision: 2,
      latexDisplay: "name",
      labelDisplay: "none"
    },
    c: {
      type: "input",
      value: 1,
      range: [-3, 3],
      step: 0.1,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "none"
    },
    "\\\\theta": {
      type: "constant",
      value: 0,
      range: [-2 * Math.PI, 2 * Math.PI],
      step: 0.01,
      name: "x",
      latexDisplay: "name",
      labelDisplay: "none"
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },

  visualizations: [
    {
      type: "plot2d",
      xAxisVar: "\\\\theta",
      xRange: [0, 13],
      xAxisPos: "center",
      yAxisVar: "y",
      yRange: [-2, 2],
      yLabelPos: "top",
      yAxisInterval: 0.5,
      width: 600,
      height: 300,
      interaction: ["vertical-drag", "c"],
      lines: [
        {
          name: "sin(θ)",
        }
      ]
    }
  ]
};`;
