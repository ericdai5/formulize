const quadraticEquation3DExample = `const config = {
  formulas: [
    {
      name: "Quadratic Equation",
      function: "y = ax^2 + bx + c"
    }
  ],
  variables: {
    y: {
      type: "dependent",
      label: "y-value",
      precision: 2
    },
    x: {
      type: "input",
      value: 0,
      range: [-5, 5],
      step: 0.1,
      label: "x"
    },
    a: {
      type: "input",
      value: 1,
      range: [-2, 2],
      step: 0.1,
      label: "Coefficient a"
    },
    b: {
      type: "input",
      value: 0,
      range: [-5, 5],
      step: 0.1,
      label: "Coefficient b"
    },
    c: {
      type: "input",
      value: 0,
      range: [-10, 10],
      step: 0.1,
      label: "Coefficient c"
    }
  },
  computation: {
    engine: "symbolic-algebra",
    expressions: ["{y} = {a} * {x} * {x} + {b} * {x} + {c}"]
  },
  
  visualizations: [
    {
      type: "plot3d",
      id: "quadratic3DSurface",
      config: {
        title: "3D Quadratic Surface: y = ax² + bx + c",
        xAxis: {
          variable: "x",
          label: "x",
          min: -5,
          max: 5
        },
        yAxis: {
          variable: "c",
          label: "Coefficient c",
          min: -5,
          max: 5
        },
        zAxis: {
          variable: "y",
          label: "y-value",
          min: -20,
          max: 40
        },
        plotType: "surface",
        width: 600,
        height: 600
      }
    }
  ]
};

const formula = await Formulize.create(config);`;

export default quadraticEquation3DExample;
