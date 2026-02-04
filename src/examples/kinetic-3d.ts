export const kinetic3D = `const config = {
  formulas: [
    {
      id: "kinetic-energy-3d",
      latex: "K = \\\\frac{1}{2}mv^2"
    }
  ],
  variables: {
    K: {
      units: "J",
      name: "Kinetic Energy",
      precision: 2
    },
    m: {
      input: "drag",
      default: 2,
      range: [0.5, 5],
      units: "kg",
      name: "Mass"
    },
    v: {
      input: "drag",
      default: 3,
      range: [0.5, 10],
      units: "m/s",
      name: "Velocity"
    }
  },
  semantics: function({ vars, data3d }) {
    vars.K = 0.5 * vars.m * vars.v * vars.v;
    data3d("energy", {x: vars.m, y: vars.v, z: vars.K});
  },

  visualizations: [
    {
      type: "plot3d",
      id: "energy3DPlot",
      title: "3D Kinetic Energy Surface",
      xRange: [0.5, 5],
      yRange: [0.5, 10],
      zRange: [0, 250],
      graphs: [
        {
          type: "surface",
          id: "energy",
          parameters: ["m", "v"],
        },
        {
          type: "point",
          id: "energy",
        }
      ]
    }
  ]
};`;
