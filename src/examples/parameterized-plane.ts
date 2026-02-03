export const parameterizedPlane = `const config = {
  formulas: [
    {
      id: "x-parameterization",
      latex: "x = 1 - t - w"
    },
    {
      id: "y-parameterization",
      latex: "y = t"
    },
    {
      id: "z-parameterization",
      latex: "z = w"
    },
    {
      id: "plane-equation",
      latex: "x + y + z = 1"
    }
  ],
  variables: {
    x: {
      name: "x-coordinate",
      precision: 2
    },
    y: {
      name: "y-coordinate",
      precision: 2
    },
    z: {
      name: "z-coordinate",
      precision: 2
    },
    t: {
      input: "drag",
      default: 0,
      range: [-15, 15],
      step: 0.1,
      name: "Parameter t"
    },
    w: {
      input: "drag",
      default: 0,
      range: [-15, 15],
      step: 0.1,
      name: "Parameter w"
    }
  },
  semantics: {
    manual: function(vars, data3d) {
      vars.x = 1 - vars.t - vars.w;
      vars.y = vars.t;
      vars.z = vars.w;
      data3d("plane", {x: vars.x, y: vars.y, z: vars.z});
    }
  },
  controls: [
    {
      id: "tSlider",
      type: "slider",
      variable: "t",
      orientation: "horizontal"
    },
    {
      id: "wSlider",
      type: "slider",
      variable: "w",
      orientation: "horizontal"
    }
  ],
  visualizations: [
    {
      type: "plot3d",
      id: "parameterizedPlane3D",
      title: "Parameterized Plane: x + y + z = 1",
      xRange: [-15, 15],
      yRange: [-15, 15],
      zRange: [-15, 15],
      graphs: [
        {
          type: "surface",
          id: "plane",
          parameters: ["t", "w"],
          name: "Parameterized Plane",
          color: "Purple",
          opacity: 0.3,
        },
        {
          type: "point",
          id: "plane",
          name: "Current Point (x, y, z)",
        }
      ]
    }
  ]
};`;
