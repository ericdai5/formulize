export const svgKineticEnergy2D = `const config = {
  formulas: [
    {
      id: "kinetic-energy",
      latex: "K = \\\\frac{1}{2}mv^2"
    }
  ],
  variables: {
    K: {
      role: "computed",
      units: "J",
      name: "Kinetic Energy",
      precision: 2,
    },
    m: {
      role: "input",
      value: 1,
      range: [0.1, 10],
      step: 1,
      units: "kg",
      name: "Mass",
      labelDisplay: "svg",
      svgPath: "./mass.svg",
      svgSize: { width: 24, height: 24 }
    },
    v: {
      role: "input",
      value: 2,
      range: [0.1, 100],
      step: 1,
      units: "m/s",
      name: "Velocity",
      labelDisplay: "svg",
      svgPath: "./velocity.svg",
      svgSize: { width: 24, height: 24 }
    }
  },
  computation: {
    engine: "manual",
    expressions: {
      "kinetic-energy": "{K} = 0.5 * {m} * {v} * {v}"
    },
    manual: function({ m, v }) {
      return 0.5 * m * Math.pow(v, 2);
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
