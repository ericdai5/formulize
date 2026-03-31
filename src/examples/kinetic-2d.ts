export const kinetic2D = `const config = {
  formulas: [
    {
      id: "kinetic-energy",
      latex: "K = \\\\frac{1}{2}mv^2"
    }
  ],
  variables: {
    K: {
      name: "Kinetic Energy $J$",
      precision: 2,
    },
    m: {
      input: "inline",
      default: 1,
      range: [0, 10],
      step: 1,
      name: "Mass $kg$",
      latexDisplay: "value",
      labelDisplay: "name",
    },
    v: {
      input: "drag",
      default: 2,
      range: [0, 10],
      step: 1,
      name: "Velocity $m/s$",
    },
  },
  semantics: function({ vars, sample }) {
    vars.K = 0.5 * vars.m * Math.pow(vars.v, 2);
    sample("energy", {x: vars.v, y: vars.K});
  },
  graph2d: [
    {
      id: "energyGraph",
      xAxisVar: "v",
      yAxisVar: "K",
      lines: [
        {
          sampleId: "energy",
          parameter: "v", 
          interaction: ["vertical-drag", "m"]
        }
      ],
      points: [
        {
          sampleId: "energy",
          interaction: ["horizontal-drag", "v"]
        }
      ]
    }
  ],
  fontSize: 1,
  labelFontSize:  0.8,
  // labelNodeStyle: { outline: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', backgroundColor: '#ffffff' },
  // formulaNodeStyle: { outline: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', backgroundColor: '#ffffff' }
};`;
