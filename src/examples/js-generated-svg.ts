export const waveEquationSVG = `
const config = {
  formulas: [
    {
      id: "wave-equation",
      latex: "{w} = {A} \\\\sin(2\\\\pi {f} {t} + {\\phi})"
    }
  ],
  variables: {
    A: {
      input: "drag",
      default: 2,
      name: "Amplitude",
      range: [0.5, 5],
      step: 0.1,
      precision: 1,
      units: "m",
      latexDisplay: "value",
      svgContent: amplitudeSvg,
      labelDisplay: "svg",
      svgSize: { width: 40, height: 40 }
    },
    f: {
      input: "drag",
      default: 1,
      name: "Frequency",
      range: [-3, 3],
      step: 0.1,
      precision: 1,
      units: "Hz",
      latexDisplay: "value",
      svgContent: frequencySvg,
      labelDisplay: "svg",
      svgSize: { width: 40, height: 40 }
    },
    phi: {
      input: "drag",
      default: 0,
      name: "Phase",
      range: [-6.28, 6.28],
      step: 0.1,
      precision: 2,
      units: "rad",
      latexDisplay: "value",
      svgContent: phaseSvg,
      labelDisplay: "svg",
      svgSize: { width: 40, height: 40 }
    },
    w: {
      name: "Wave Value",
      units: "m",
      precision: 2,
    },
    t: {
      input: "drag",
      default: 0,
      name: "Time",
      range: [0, 10],
      step: 0.1,
      precision: 1,
      units: "s",
    }
  },
  semantics: function({ vars, data2d }) {
    vars.w = vars.A * Math.sin(2 * Math.PI * vars.f * vars.t + vars.phi);
    data2d("wave", {x: vars.t, y: vars.w});
  },
  visualizations: [
    {
      type: "plot2d",
      xAxisLabel: "t",
      xAxisVar: "t",
      xRange: [0, 10],
      xGrid: "show",
      yAxisLabel: "w",
      yAxisVar: "w",
      yRange: [-6, 6],
      yGrid: "show",
      graphs: [
        {
          type: "line",
          id: "wave",
          parameter: "t",
          samples: 500,
          interaction: ["vertical-drag", "A"]
        },
        {
          type: "point",
          id: "wave",
          interaction: ["horizontal-drag", "t"]
        }
      ]
    }
  ],
  fontSize: 1.5
};

// SVG content generator functions
function amplitudeSvg(ctx) {
  const amplitude = typeof ctx.value === 'number' ? ctx.value : 2;
  const normalizedAmp = (amplitude / 5) * 40;
  const centerY = 50;
  let wavePath = "M 5 " + centerY;
  const points = 25;
  for (let i = 0; i <= points; i++) {
    const x = 5 + (i / points) * 90;
    const y = centerY - normalizedAmp * Math.sin((i / points) * Math.PI * 2);
    wavePath += " L " + x.toFixed(1) + " " + y.toFixed(1);
  }
  const peakY = centerY - normalizedAmp;
  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <line x1="5" y1="\${centerY}" x2="95" y2="\${centerY}"
          stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,3"/>
    <rect x="24" y="\${peakY}" width="5" height="\${normalizedAmp}"
          fill="#8B5CF6" opacity="0.5" rx="2"/>
    <rect x="69" y="\${centerY}" width="5" height="\${normalizedAmp}"
          fill="#8B5CF6" opacity="0.5" rx="2"/>
    <path d="\${wavePath}"
          fill="none" stroke="#8B5CF6" stroke-width="3" stroke-linecap="round"/>
  </svg>\`;
}

function frequencySvg(ctx) {
  const frequency = typeof ctx.value === 'number' ? ctx.value : 1;
  const waveCount = Math.min(Math.abs(frequency) * 2, 6);
  const centerY = 50;
  const amplitude = 35;
  const pointsPerWave = 25;
  const points = Math.max(50, Math.ceil(waveCount * pointsPerWave));
  let wavePath = "M 5 " + centerY;
  for (let i = 0; i <= points; i++) {
    const x = 5 + (i / points) * 90;
    const y = centerY - amplitude * Math.sin((i / points) * waveCount * Math.PI * 2);
    wavePath += " L " + x.toFixed(1) + " " + y.toFixed(1);
  }
  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <line x1="5" y1="\${centerY}" x2="95" y2="\${centerY}"
          stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,3"/>
    <path d="\${wavePath}"
          fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"/>
  </svg>\`;
}

function phaseSvg(ctx) {
  const phase = typeof ctx.value === 'number' ? ctx.value : 0;
  const centerY = 50;
  const amplitude = 35;
  let refPath = "M 5 " + centerY;
  let shiftedPath = "M 5 " + centerY;
  const points = 40;
  for (let i = 0; i <= points; i++) {
    const x = 5 + (i / points) * 90;
    const refY = centerY - amplitude * Math.sin((i / points) * Math.PI * 2);
    const shiftedY = centerY - amplitude * Math.sin((i / points) * Math.PI * 2 + phase);
    refPath += " L " + x.toFixed(1) + " " + refY.toFixed(1);
    shiftedPath += " L " + x.toFixed(1) + " " + shiftedY.toFixed(1);
  }
  return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <line x1="5" y1="\${centerY}" x2="95" y2="\${centerY}"
          stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,3"/>
    <path d="\${refPath}"
          fill="none" stroke="#94A3B8" stroke-width="1.5"
          stroke-dasharray="4,4" opacity="0.6"/>
    <path d="\${shiftedPath}"
          fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
  </svg>\`;
}`;
