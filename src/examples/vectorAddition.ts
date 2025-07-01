export const vectorAddition = `const config = {
  formulas: [
    {
      name: "Vector Addition",
      function: "\\\\begin{bmatrix} {ax} \\\\\\\\ {ay} \\\\end{bmatrix} + \\\\begin{bmatrix} {bx} \\\\\\\\ {by} \\\\end{bmatrix} = \\\\begin{bmatrix} {cx} \\\\\\\\ {cy} \\\\end{bmatrix}",
      expression: "[{cx}, {cy}] = [{ax}, {ay}] + [{bx}, {by}]"
    }
  ],
  variables: {
    ax: {
      type: "input",
      value: 3,
      range: [-10, 10],
      step: 0.5,
      precision: 1
    },
    ay: {
      type: "input", 
      value: 4,
      range: [-10, 10],
      step: 0.5,
      precision: 1
    },
    bx: {
      type: "input",
      value: 2,
      range: [-10, 10], 
      step: 0.5,
      precision: 1
    },
    by: {
      type: "input",
      value: -1,
      range: [-10, 10],
      step: 0.5,
      precision: 1
    },
    cx: {
      type: "dependent",
      precision: 1
    },
    cy: {
      type: "dependent",
      precision: 1
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
      traces: [
        {
          shape: "arrow",
          x: [0, "{ax}"],
          y: [0, "{ay}"],
          name: "Vector A",
          line: { color: "red", width: 2 },
          marker: { size: 3, color: "red" }
        },
        {
          shape: "arrow",
          x: [0, "{bx}"],
          y: [0, "{by}"],
          name: "Vector B",
          line: { color: "blue", width: 2 },
          marker: { size: 3, color: "blue" }
        },
        {
          shape: "arrow", 
          x: [0, "{cx}"],
          y: [0, "{cy}"],
          name: "Vector Sum (A + B)",
          line: { color: "green", width: 2 },
          marker: { size: 3, color: "green" }
        },
        {
          shape: "dash",
          x: ["{ax}", "{cx}"],
          y: ["{ay}", "{cy}"],
          name: "Vector B (from tip of A)",
          line: { color: "blue", width: 2 },
          showlegend: false
        }
      ]
    }
  ]
};

const formula = await Formulize.create(config);`;
