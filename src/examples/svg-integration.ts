export const svgIntegration = `const config = {
  formulas: [
    {
      id: "radioactive-decay",
      latex: "{N} = {N_{0}} \\\\times e^{-{\\\\lambda} \\\\times {t}}"
    }
  ],
  variables: {
    N: {
      role: "computed",
      name: "Substance Remaining",
      units: "atoms",
      precision: 0,
      latexDisplay: "value",
      svgContent: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <!-- Green radioactive hazard symbol -->
        <g>
          <!-- Background circle -->
          <circle cx="12" cy="12" r="10" fill="#00E676" opacity="0.2">
            <animate attributeName="opacity" values="0.2;0.4;0.2" dur="2s" repeatCount="indefinite"/>
          </circle>

          <!-- Three evenly spaced radioactive petals (120 degrees apart) -->
          <g>
            <animateTransform attributeName="transform" type="rotate"
                             from="0 12 12" to="360 12 12" dur="8s" repeatCount="indefinite"/>
            <!-- Top petal (0 degrees) -->
            <path d="M 12 12 L 10 5 A 4.5 4.5 0 0 1 14 5 Z" fill="#00E676"/>
            <!-- Bottom right petal (120 degrees from top) -->
            <path d="M 12 12 L 10 5 A 4.5 4.5 0 0 1 14 5 Z" fill="#00E676" transform="rotate(120 12 12)"/>
            <!-- Bottom left petal (240 degrees from top) -->
            <path d="M 12 12 L 10 5 A 4.5 4.5 0 0 1 14 5 Z" fill="#00E676" transform="rotate(240 12 12)"/>
          </g>

          <!-- Center circle -->
          <circle cx="12" cy="12" r="2.5" fill="#00C853">
            <animate attributeName="r" values="2.5;3;2.5" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        </g>
      </svg>\`,
      svgMode: "replace",
      defaultCSS: "filter: drop-shadow(0 0 8px #7FFF00) saturate(calc({value} / 1000));",
      hoverCSS: "filter: drop-shadow(0 0 12px #00FF00); transform: scale(1.1);"
    },
    N_0: {
      role: "input",
      default: 1000,
      name: "Substance Initial",
      range: [100, 10000],
      step: 100,
      precision: 0,
      units: "atoms",
      latexDisplay: "name",
      memberOf: "N",
      defaultCSS: "filter: drop-shadow(0 0 8px #7FFF00) saturate(1);",
      hoverCSS: "filter: drop-shadow(0 0 12px #00FF00); transform: scale(1.1);"
    },
    "\\\\lambda": {
      role: "input",
      default: 0.1,
      name: "Decay Constant",
      range: [0.01, 0.5],
      step: 0.01,
      precision: 3,
      units: "1/hr",
      latexDisplay: "name",
    },
    t: {
      role: "input",
      default: 5,
      name: "time",
      range: [0, 50],
      step: 0.5,
      precision: 1,
      units: "hr",
      latexDisplay: "value",
      svgContent: \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <!-- Outer clock circle -->
        <circle cx="12" cy="12" r="10" fill="#E0E7FF" stroke="#4169E1" stroke-width="2"/>
        <!-- Clock hands -->
        <g>
          <!-- Hour hand (shorter, slower) -->
          <line x1="12" y1="12" x2="12" y2="8" stroke="#2563EB" stroke-width="2" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate"
                             from="0 12 12" to="360 12 12" dur="120s" repeatCount="indefinite"/>
          </line>
          <!-- Minute hand (longer, faster) -->
          <line x1="12" y1="12" x2="12" y2="5" stroke="#4169E1" stroke-width="1.5" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate"
                             from="0 12 12" to="360 12 12" dur="10s" repeatCount="indefinite"/>
          </line>
        </g>
        <!-- Center dot -->
        <circle cx="12" cy="12" r="1" fill="#1E40AF"/>
      </svg>\`,
      svgMode: "replace"
    }
  },
  semantics: {
    engine: "manual",
    expressions: {
      "radioactive-decay": "{N} = {N_0} * exp(-{\\\\lambda} * {t})"
    },
    manual: function({ N_0, "\\\\lambda": lambda, t }) {
      return N_0 * Math.exp(-lambda * t);
    }
  },
  visualizations: [
    {
      type: "plot2d",
      xAxis: "t",
      xRange: [0, 50],
      xGrid: "show",
      yAxis: "N",
      yRange: [0, 1100],
      yGrid: "show",
      lines: [
        {
          color: "#7FFF00",
        }
      ]
    }
  ],
  fontSize: 1.5
};`;
