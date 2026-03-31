export const svgIntegration = `const config = {
  formulas: [
    {
      id: "radioactive-decay",
      latex: "{N} = {N_{0}} \\\\times e^{-{\\\\lambda} \\\\times {t}}"
    }
  ],
  variables: {
    N: {
      name: "Remaining Substance",
      units: "atoms",
      precision: 0,
      svgContent: dynamicDecaySvg,
      latexDisplay: "svg"
    },
    "N_{0}": {
      input: "drag",
      default: 1000,
      name: "Initial Substance",
      range: [100, 10000],
      step: 100,
      precision: 0,
      units: "atoms",
      svgContent: dynamicInitialSvg,
      latexDisplay: "svg"
    },
    "\\\\lambda": {
      input: "drag",
      default: 0.1,
      name: "Decay",
      range: [0.01, 0.5],
      step: 0.01,
      precision: 3,
      units: "1/hr",
      latexDisplay: "name",
    },
    t: {
      input: "drag",
      default: 5,
      name: "Time",
      range: [0, 50],
      step: 0.5,
      precision: 1,
      units: "hr",
      svgContent: dynamicClockSvg,
      latexDisplay: "svg"
    }
  },
  semantics: function({ vars, sample }) {
    vars.N = vars["N_{0}"] * Math.exp(-vars["\\\\lambda"] * vars.t);
    sample("decay", {x: vars.t, y: vars.N});
  },
  graph2d: [
    {
      id: "decayGraph",
      xAxisLabel: "t",
      xAxisVar: "t",
      xRange: [0, 50],
      xGrid: "show",
      yAxisLabel: "N",
      yAxisVar: "N",
      yRange: [0, 1100],
      yGrid: "show",
      lines: [
        {
          sampleId: "decay",
          parameter: "t",
          color: "#7FFF00",
          interaction: ["vertical-drag", "N_{0}"]
        }
      ],
      points: [
        {
          sampleId: "decay",
          color: "#7FFF00",
          interaction: ["horizontal-drag", "t"]
        }
      ]
    }
  ],
  fontSize: 1.5
};

// Dynamic SVG - remaining substance fades as decay progresses
function dynamicDecaySvg(ctx) {
  const value = typeof ctx.value === 'number' ? ctx.value : 1000;
  const env = ctx.environment || {};
  const N_0 = env["N_{0}"] || 1000;
  const ratio = Math.min(value / N_0, 1);
  const saturation = ratio; // Direct percentage of initial substance

  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#00E676" opacity="\${saturation * 0.4}"/>
    <path d="M 12 12 L 10 5 A 4.5 4.5 0 0 1 14 5 Z" fill="#00E676" opacity="\${saturation}"/>
    <path d="M 12 12 L 10 5 A 4.5 4.5 0 0 1 14 5 Z" fill="#00E676" opacity="\${saturation}" transform="rotate(120 12 12)"/>
    <path d="M 12 12 L 10 5 A 4.5 4.5 0 0 1 14 5 Z" fill="#00E676" opacity="\${saturation}" transform="rotate(240 12 12)"/>
    <circle cx="12" cy="12" r="2.5" fill="#00C853" opacity="\${saturation}"/>
  </svg>\`;
}

// Dynamic SVG - initial substance at full saturation
function dynamicInitialSvg(ctx) {
  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#00E676" opacity="0.4"/>
    <path d="M 12 12 L 10 5 A 4.5 4.5 0 0 1 14 5 Z" fill="#00E676"/>
    <path d="M 12 12 L 10 5 A 4.5 4.5 0 0 1 14 5 Z" fill="#00E676" transform="rotate(120 12 12)"/>
    <path d="M 12 12 L 10 5 A 4.5 4.5 0 0 1 14 5 Z" fill="#00E676" transform="rotate(240 12 12)"/>
    <circle cx="12" cy="12" r="2.5" fill="#00C853"/>
  </svg>\`;
}

// Dynamic SVG - clock hands rotate based on time value
function dynamicClockSvg(ctx) {
  const time = typeof ctx.value === 'number' ? ctx.value : 0;
  // Hour hand rotates once per 12 hours, minute hand once per hour
  const hourAngle = (time / 12) * 360;
  const minuteAngle = (time % 1) * 360;

  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <!-- Outer clock circle -->
    <circle cx="12" cy="12" r="10" fill="#E0E7FF" stroke="#4169E1" stroke-width="2"/>
    <!-- Hour hand -->
    <line x1="12" y1="12" x2="12" y2="7" stroke="#2563EB" stroke-width="2" stroke-linecap="round"
          transform="rotate(\${hourAngle} 12 12)"/>
    <!-- Minute hand -->
    <line x1="12" y1="12" x2="12" y2="5" stroke="#4169E1" stroke-width="1.5" stroke-linecap="round"
          transform="rotate(\${minuteAngle} 12 12)"/>
    <!-- Center dot -->
    <circle cx="12" cy="12" r="1" fill="#1E40AF"/>
  </svg>\`;
}`;
