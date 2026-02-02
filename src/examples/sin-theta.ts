export const sinTheta = `const config = {
  formulas: [
    {
      id: "sin-theta",
      latex: "y = c \\\\sin(\\\\theta)"
    }
  ],
  variables: {
    y: {
      precision: 2,
      latexDisplay: "name",
      labelDisplay: "none"
    },
    c: {
      input: "drag",
      default: 1,
      range: [-3, 3],
      step: 0.1,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "none",
      defaultCSS: "min-width:85px; text-align:right; margin-left:-2px"
    },
    "\\\\theta": {
      default: 0,
      range: [-2 * Math.PI, 2 * Math.PI],
      step: 0.01,
      name: "x",
      latexDisplay: "name",
      labelDisplay: "none"
    }
  },
  semantics: {
    manual: function(vars) {
      vars.y = vars.c * Math.sin(vars["\\\\theta"]);
    }
  },

  visualizations: [
    {
      type: "plot2d",
      xAxis: "\\\\theta",
      xRange: [0, 13],
      xAxisPos: "center",
      xGrid: "hide",
      yAxis: "y",
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
