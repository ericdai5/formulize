export const svgKineticEnergy2D = `const config = {
  formulas: [
    {
      id: "kinetic-energy",
      latex: "K = \\\\frac{1}{2} \\\\times m \\\\times v^2"
    }
  ],
  variables: {
    K: {
      units: "J",
      name: "Kinetic Energy",
      precision: 2,
    },
    m: {
      input: "drag",
      default: 1,
      range: [0.1, 10],
      step: 1,
      units: "kg",
      name: "Mass",
      labelDisplay: "svg",
      latexDisplay: "value",
      svgPath: "/mass.svg",
      svgSize: { width: 24, height: 24 }
    },
    v: {
      input: "drag",
      default: 2,
      range: [0.1, 100],
      step: 1,
      units: "m/s",
      name: "Velocity",
      labelDisplay: "svg",
      latexDisplay: "value",
      svgPath: "/velocity.svg",
      svgSize: { width: 24, height: 24 }
    }
  },
  semantics: function(vars, data3d, data2d) {
    vars.K = 0.5 * vars.m * Math.pow(vars.v, 2);
    data2d("energy", {x: vars.v, y: vars.K});
  },
  visualizations: [
    {
      type: "plot2d",
      xAxisLabel: "v",
      xAxisVar: "v",
      xRange: [0, 100],
      yAxisLabel: "K",
      yAxisVar: "K",
      yRange: [0, 5000],
      graphs: [
        {
          type: "line",
          id: "energy",
          parameter: "v",
          interaction: ["vertical-drag", "m"]
        },
        {
          type: "point",
          id: "energy",
          interaction: ["horizontal-drag", "v"]
        }
      ]
    }
  ],
  fontSize: 1.5
};`;
