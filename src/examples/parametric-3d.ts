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
  semantics: function({ vars, sample }) {
    vars.z = 1 - vars.x - vars.y;
    sample("plane1", {x: vars.x, y: vars.y, z: vars.z});
    vars.z = vars.x;
    sample("plane2", {x: vars.x, y: vars.y, z: vars.z});
    vars.x = vars.t;
    vars.y = 1 - 2 * vars.t;
    vars.z = vars.t;
    sample("line", {x: vars.x, y: vars.y, z: vars.z});
  },
  graph3d: [
    {
      id: "parametricPlane3D",
      xRange: [-5, 5],
      yRange: [-5, 5],
      zRange: [-5, 5],
      surfaces: [
        {
          sampleId: "plane1",
          parameters: ["x", "y"],
          name: "Plane x+y+z=1",
          opacity: 0.5,
          color: "purple",
        },
        {
          sampleId: "plane2",
          parameters: ["x", "y"],
          name: "Plane x=z",
          opacity: 0.5,
          color: "green",
        }
      ],
      lines: [
        {
          sampleId: "line",
          parameter: "t",
          name: "Intersection Line",
          width: 6,
          color: "yellow",
        }
      ],
      points: [
        {
          sampleId: "line",
          name: "Current Position",
        }
      ]
    }
  ]
};`;
