export const waveEquationSVG = `const config = {
  formulas: [
    {
      id: "wave-equation",
      latex: "{w} = {A} \\\\sin(2\\\\pi {f} {t} + {\\phi})",
      expression: "{w} = {A} * sin(2 * pi * {f} * {t} + {phi})",
      manual: function({ A, f, t, phi }) {
        return A * Math.sin(2 * Math.PI * f * t + phi);
      }
    }
  ],
  variables: {
    A: {
      role: "input",
      value: 2,
      name: "Amplitude",
      range: [0.5, 5],
      step: 0.1,
      precision: 1,
      units: "m",
      latexDisplay: "value",
      svgContent: (ctx) => {
        const amplitude = typeof ctx.value === 'number' ? ctx.value : 2;
        const normalizedAmp = (amplitude / 5) * 40;
        const centerY = 50;
        const gradientId = "amp-gradient-" + Math.random().toString(36).substr(2, 9);
        let wavePath = "M 5 " + centerY;
        const points = 25;
        for (let i = 0; i <= points; i++) {
          const x = 5 + (i / points) * 90;
          const y = centerY - normalizedAmp * Math.sin((i / points) * Math.PI * 2);
          wavePath += " L " + x.toFixed(1) + " " + y.toFixed(1);
        }
        const peakY = centerY - normalizedAmp;
        const troughY = centerY + normalizedAmp;
        return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="\${gradientId}" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" style="stop-color:#EC4899;stop-opacity:0.8"/>
              <stop offset="50%" style="stop-color:#8B5CF6;stop-opacity:0.6"/>
              <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:0.8"/>
            </linearGradient>
          </defs>
          <line x1="5" y1="\${centerY}" x2="95" y2="\${centerY}"
                stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,3"/>
          <rect x="24" y="\${peakY}" width="5" height="\${normalizedAmp}"
                fill="url(#\${gradientId})" opacity="0.5" rx="2"/>
          <rect x="69" y="\${centerY}" width="5" height="\${normalizedAmp}"
                fill="url(#\${gradientId})" opacity="0.5" rx="2"/>
          <path d="\${wavePath}"
                fill="none" stroke="url(#\${gradientId})" stroke-width="3" stroke-linecap="round"/>
        </svg>\`;
      },
      labelDisplay: "svg",
      svgSize: { width: 125, height: 125 }
    },
    f: {
      role: "input",
      value: 1,
      name: "Frequency",
      range: [-3, 3],
      step: 0.1,
      precision: 1,
      units: "Hz",
      latexDisplay: "value",
      svgContent: (ctx) => {
        const frequency = typeof ctx.value === 'number' ? ctx.value : 1;
        const waveCount = Math.min(frequency * 2, 6); // Max 6 waves visible
        const centerY = 50;
        const amplitude = 35; // Increased to use more vertical space
        const gradientId = "freq-gradient-" + Math.random().toString(36).substr(2, 9);
        const pointsPerWave = 25;
        const points = Math.max(50, Math.ceil(waveCount * pointsPerWave));
        let wavePath = "M 5 " + centerY;
        for (let i = 0; i <= points; i++) {
          const x = 5 + (i / points) * 90;
          const y = centerY - amplitude * Math.sin((i / points) * waveCount * Math.PI * 2);
          wavePath += " L " + x.toFixed(1) + " " + y.toFixed(1);
        }
        return \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="\${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#10B981;stop-opacity:0.9"/>
              <stop offset="50%" style="stop-color:#06B6D4;stop-opacity:0.8"/>
              <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:0.9"/>
            </linearGradient>
          </defs>
          <line x1="5" y1="\${centerY}" x2="95" y2="\${centerY}"
                stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,3"/>
          <path d="\${wavePath}"
                fill="none" stroke="url(#\${gradientId})" stroke-width="2.5" stroke-linecap="round"/>
        </svg>\`;
      },
      labelDisplay: "svg",
      svgSize: { width: 125, height: 125 }
    },
    phi: {
      role: "input",
      value: 0,
      name: "Phase",
      range: [-6.28, 6.28],
      step: 0.1,
      precision: 2,
      units: "rad",
      latexDisplay: "value",
      svgContent: (ctx) => {
        const phase = typeof ctx.value === 'number' ? ctx.value : 0;
        const centerY = 50;
        const amplitude = 35; // Increased to use more vertical space
        const gradientId = "phase-gradient-" + Math.random().toString(36).substr(2, 9);
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
          <defs>
            <linearGradient id="\${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:0.7"/>
              <stop offset="100%" style="stop-color:#EF4444;stop-opacity:0.9"/>
            </linearGradient>
          </defs>
          <line x1="5" y1="\${centerY}" x2="95" y2="\${centerY}"
                stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,3"/>
          <path d="\${refPath}"
                fill="none" stroke="#94A3B8" stroke-width="1.5"
                stroke-dasharray="4,4" opacity="0.6"/>
          <path d="\${shiftedPath}"
                fill="none" stroke="url(#\${gradientId})" stroke-width="2.5" stroke-linecap="round"/>
        </svg>\`;
      },
      labelDisplay: "svg",
      svgSize: { width: 125, height: 125 }
    },
    w: {
      role: "computed",
      name: "Wave Value",
      units: "m",
      precision: 2,
    },
    t: {
      role: "input",
      value: 0,
      name: "Time",
      range: [0, 10],
      step: 0.1,
      precision: 1,
      units: "s",
    }
  },
  computation: {
    engine: "manual"
  },
  visualizations: [
    {
      type: "plot2d",
      xAxis: "t",
      xRange: [0, 10],
      xGrid: "show",
      yAxis: "w",
      yRange: [-6, 6],
      yGrid: "show",
    }
  ],
  fontSize: 1.3
};`;
