export const vectorAddition = `const config = {
  formulas: [
    {
      name: "Vector Addition",
      function: "{k_1} \\\\begin{bmatrix} {ax} \\\\\\\\ {ay} \\\\end{bmatrix} + {k_2} \\\\begin{bmatrix} {bx} \\\\\\\\ {by} \\\\end{bmatrix} = \\\\begin{bmatrix} {cx} \\\\\\\\ {cy} \\\\end{bmatrix}",
      expression: "[{cx}, {cy}] = {k_1} * [{ax}, {ay}] + {k_2} * [{bx}, {by}]"
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
    ax: {
      type: "input",
      value: 2,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      display: "value"
    },
    ay: {
      type: "input", 
      value: 2,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      display: "value"
    },
    bx: {
      type: "input",
      value: -1,
      range: [-10, 10], 
      step: 0.5,
      precision: 1,
      display: "value"
    },
    by: {
      type: "input",
      value: -1,
      range: [-10, 10],
      step: 0.5,
      precision: 1,
      display: "value"
    },
    cx: {
      type: "dependent",
      precision: 1,
      display: "value"
    },
    cy: {
      type: "dependent",
      precision: 1,
      display: "value"
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
          x: [0, "ax"],
          y: [0, "ay"],
          name: "Vector A",
          color: "blue",
          lineWidth: 2,
          markerSize: 3
        },
        {
          shape: "arrow",
          x: [0, "bx"],
          y: [0, "by"],
          name: "Vector B",
          color: "green",
          lineWidth: 2,
          markerSize: 3
        },
        {
          shape: "point",
          x: ["cx"],
          y: ["cy"],
          name: "Tip of Vector C",
          color: "red",
          markerSize: 5,
          showlegend: false
        }
      ]
    }
  ]
};

const formula = await Formulize.create(config);`;
