export const parametric3D = `const config = {
  formulas: [
    {
      id: "x-and-t",
      latex: "x = t"
    },
    {
      id: "y-and-t",
      latex: "y = 1 - 2t"
    },
    {
      id: "z-and-t",
      latex: "z = t"
    },
    {
      id: "x-plus-y-plus-z-equals-1",
      latex: "1 = x + y + z"
    },
    {
      id: "x-and-z",
      latex: "x - z = 0"
    }
  ],
  variables: {
    x: {
      input: "drag",
      default: 0,
      range: [-5, 5],
      step: 0.1,
      name: "x-coordinate",
      precision: 1
    },
    y: {
      input: "drag",
      default: 0,
      range: [-5, 5],
      step: 0.1,
      name: "y-coordinate",
      precision: 1
    },
    z: {
      name: "z-coordinate",
      precision: 1
    },
    t: {
      input: "drag",
      default: 0,
      range: [-3, 3],
      step: 0.1,
      name: "Parameter t"
    },
  },
  semantics: {
    manual: function(vars, data3d) {
      vars.z = 1 - vars.x - vars.y;
      data3d("plane1", {x: vars.x, y: vars.y, z: vars.z});
      vars.z = vars.x;
      data3d("plane2", {x: vars.x, y: vars.y, z: vars.z});
      vars.x = vars.t;
      vars.y = 1 - 2 * vars.t;
      vars.z = vars.t;
      data3d("line", {x: vars.x, y: vars.y, z: vars.z});
    }
  },
  visualizations: [
    {
      type: "plot3d",
      id: "parametricPlane3D",
      title: "3D Parametric Line on Intersecting Planes",
      xRange: [-5, 5],
      yRange: [-5, 5],
      zRange: [-5, 5],
      graphs: [
        {
          type: "surface",
          id: "plane1",
          parameters: ["x", "y"],
          name: "Plane x+y+z=1",
          opacity: 0.5,
          color: "purple",
        },
        {
          type: "surface",
          id: "plane2",
          parameters: ["x", "y"],
          name: "Plane x=z",
          opacity: 0.5,
          color: "green",
        },
        {
          type: "line",
          id: "line",
          parameter: "t",
          name: "Intersection Line",
          width: 6,
          color: "yellow",
        },
        {
          type: "point",
          id: "line",
          name: "Current Position",
        }
      ]
    }
  ]
};`;
