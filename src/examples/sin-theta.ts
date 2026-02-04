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
      labelDisplay: "value"
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
      range: [0, 13],
      step: 0.01,
      name: "x",
      latexDisplay: "name",
      labelDisplay: "value"
    }
  },
  semantics: function({ vars, data2d }) {
    vars.y = vars.c * Math.sin(vars["\\\\theta"]);
    data2d("sine", {x: vars["\\\\theta"], y: vars.y});
  },

  visualizations: [
    {
      type: "plot2d",
      xAxisLabel: "\\\\theta",
      xAxisVar: "\\\\theta",
      xRange: [0, 13],
      xAxisPos: "center",
      xGrid: "hide",
      yAxisLabel: "y",
      yAxisVar: "y",
      yRange: [-2, 2],
      yLabelPos: "top",
      yAxisInterval: 0.5,
      width: 600,
      height: 300,
      graphs: [
        {
          type: "line",
          id: "sine",
          parameter: "\\\\theta",
          interaction: ["vertical-drag", "c"]
        },
        {
          type: "point",
          id: "sine",
          interaction: ["horizontal-drag", "\\\\theta"]
        }
      ]
    }
  ]
};`;
