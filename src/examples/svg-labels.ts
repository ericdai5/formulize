export const svgKineticEnergy2D = `const config = {
  formulas: [
    {
      id: "kinetic-energy",
      latex: "K = \\\\frac{1}{2}mv^2"
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
      svgPath: "/velocity.svg",
      svgSize: { width: 24, height: 24 }
    }
  },
  semantics: {
    manual: function(vars) {
      vars.K = 0.5 * vars.m * Math.pow(vars.v, 2);
    }
  },
  visualizations: [
    {
      type: "plot2d",
      xAxis: "v",
      yAxis: "K",
      lines: [
        {
          name: "Kinetic Energy Formula",
        }
      ]
    }
  ],
  fontSize: 1.5
};`;
