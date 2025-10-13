export const svgIntegration = `const config = {
  formulas: [
    {
      formulaId: "kinetic-energy",
      latex: "{K} = \\\\frac{1}{2}{m}{v}^2",
      expression: "{K} = 0.5 * {m} * {v} * {v}"
    }
  ],
  variables: {
    K: {
      type: "dependent",
      name: "K",
      units: "J",
      precision: 2,
      latexDisplay: "value",
      svgContent: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <polygon points="10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8" fill="currentColor" stroke="none" stroke-width="1">
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 10 10"
            to="360 10 10"
            dur="3s"
            repeatCount="indefinite"/>
        </polygon>
      </svg>\`,
      svgSize: { width: 20, height: 20 },
      svgMode: "append",
      defaultCSS: "color: #FFA500; transform: translateY(10px);",
      hoverCSS: "color: #FF0000; transform: translateY(-5px) scale(1.2);"
    },
    m: {
      type: "input",
      value: 2,
      name: "m",
      range: [0.1, 10],
      step: 0.1,
      precision: 1,
      units: "kg",
      latexDisplay: "value"
    },
    v: {
      type: "input",
      value: 5,
      name: "v",
      range: [0, 20],
      step: 0.5,
      precision: 1,
      units: "m/s",
      latexDisplay: "value",
      svgPath: "arrow",
      svgSize: { width: 36, height: 36 },
      svgMode: "append",
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },
  visualizations: [
    {
      type: "plot2d",
      id: "kinetic-energy-plot",
      title: "Kinetic Energy vs Velocity",
      xAxisVar: "v",
      xRange: [0, 20],
      xAxisPos: "bottom",
      xGrid: "show",
      yAxisVar: "K",
      yRange: [0, 400],
      yAxisPos: "left",
      yGrid: "show",
      width: 500,
      height: 400,
      lines: [
        {
          name: "K = ½mv²",
          color: "#FF5722",
          showInLegend: true
        }
      ]
    }
  ],
  fontSize: 1.2
};`;
