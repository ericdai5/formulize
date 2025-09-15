export const vectorAddition = `const config = {
  formulas: [
    {
      formulaId: "vector-addition",
      latex: "{k_1} \\\\begin{bmatrix} {a_x} \\\\\\\\ {a_y} \\\\end{bmatrix} + {k_2} \\\\begin{bmatrix} {b_x} \\\\\\\\ {b_y} \\\\end{bmatrix} = \\\\begin{bmatrix} {c_x} \\\\\\\\ {c_y} \\\\end{bmatrix}",
      expression: "[{c_x}, {c_y}] = {k_1} * [{a_x}, {a_y}] + {k_2} * [{b_x}, {b_y}]"
    }
  ],
  variables: {
    k_1: {
      type: "input",
      value: 1,
      range: [-3, 3],
      step: 0.1,
      precision: 1
    },
    k_2: {
      type: "input",
      value: 1,
      range: [-3, 3],
      step: 0.1,
      precision: 1
    },
    a_x: {
      type: "input",
      value: 2,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    a_y: {
      type: "input", 
      value: 2,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    b_x: {
      type: "input",
      value: -1,
      range: [-10, 10], 
      step: 0.5,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    b_y: {
      type: "input",
      value: -1,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    c_x: {
      type: "dependent",
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    c_y: {
      type: "dependent",
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
  },
  computation: {
    engine: "symbolic-algebra"
  },
  fontSize: 0.6,
  
  visualizations: [
    {
      type: "plot2d",
      id: "vectorPlot",
      title: "Vector Addition Visualization",
      xRange: [-5, 5],
      yRange: [-5, 5],
      width: 600,
      height: 600,
      vectors: [
        {
          shape: "arrow",
          x: [0, "a_x"],
          y: [0, "a_y"],
          name: "Vector A",
          color: "blue",
          lineWidth: 2,
          markerSize: 3
        },
        {
          shape: "arrow",
          x: [0, "b_x"],
          y: [0, "b_y"],
          name: "Vector B",
          color: "green",
          lineWidth: 2,
          markerSize: 3
        },
        {
          shape: "point",
          x: ["c_x"],
          y: ["c_y"],
          name: "Tip of Vector C",
          color: "red",
          markerSize: 5,
          showlegend: false
        }
      ]
    }
  ]
};`;
