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
  semantics: function({ vars, sample }) {
    vars.c_x = vars.k_1 * vars.a_x + vars.k_2 * vars.b_x;
    vars.c_y = vars.k_1 * vars.a_y + vars.k_2 * vars.b_y;
    sample("origin", { x: 0, y: 0 });
    sample("vectorAEnd", { x: vars.a_x, y: vars.a_y });
    sample("vectorBEnd", { x: vars.b_x, y: vars.b_y });
    sample("vectorCPoint", { x: vars.c_x, y: vars.c_y });
  },
  fontSize: 1.5,
  
  graph2d: [
    {
      id: "vectorPlot",
      xRange: [-5, 5],
      yRange: [-5, 5],
      vectors: [
        {
          startSampleId: "origin",
          endSampleId: "vectorAEnd",
          interaction: ["a_x", "a_y"],
          color: "blue",
          label: "A",
        },
        {
          startSampleId: "origin",
          endSampleId: "vectorBEnd",
          interaction: ["b_x", "b_y"],
          color: "green",
          label: "B",
        },
      ],
      points: [
        {
          sampleId: "vectorCPoint",
          color: "red",
          showLabel: false,
        }
      ]
    }
  ]
};`;
