export const vectorAddition = `const config = {
  formulas: [
    {
      id: "vector-addition",
      latex: "{k_1} \\\\begin{bmatrix} {a_x} \\\\\\\\ {a_y} \\\\end{bmatrix} + {k_2} \\\\begin{bmatrix} {b_x} \\\\\\\\ {b_y} \\\\end{bmatrix} = \\\\begin{bmatrix} {c_x} \\\\\\\\ {c_y} \\\\end{bmatrix}"
    }
  ],
  variables: {
    k_1: {
      input: "drag",
      default: 1,
      range: [-3, 3],
      step: 0.1,
      precision: 1
    },
    k_2: {
      input: "drag",
      default: 1,
      range: [-3, 3],
      step: 0.1,
      precision: 1
    },
    a_x: {
      input: "drag",
      default: 2,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    a_y: {
      input: "drag",
      default: 2,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    b_x: {
      input: "drag",
      default: -1,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    b_y: {
      input: "drag",
      default: -1,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    c_x: {
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
    c_y: {
      precision: 1,
      latexDisplay: "value",
      labelDisplay: "name"
    },
  },
  semantics: function(vars) {
    vars.c_x = vars.k_1 * vars.a_x + vars.k_2 * vars.b_x;
    vars.c_y = vars.k_1 * vars.a_y + vars.k_2 * vars.b_y;
  },
  fontSize: 1.5,
  
  visualizations: [
    {
      type: "plot2d",
      id: "vectorPlot",
      title: "Vector Addition Visualization",
      xRange: [-5, 5],
      yRange: [-5, 5],
      vectors: [
        {
          shape: "arrow",
          x: [0, "a_x"],
          y: [0, "a_y"],
          name: "Vector A",
          color: "blue",
          lineWidth: 2,
          markerSize: 3,
          label: "A",
          labelPosition: "mid"
        },
        {
          shape: "arrow",
          x: [0, "b_x"],
          y: [0, "b_y"],
          name: "Vector B",
          color: "green",
          lineWidth: 2,
          markerSize: 3,
          label: "B",
          labelPosition: "mid"
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
