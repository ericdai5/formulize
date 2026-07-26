export const nthSelection = `const config = {
  formulas: [
    {
      id: "a",
      latex: "A = v + v + v + v_i + v_i + v_i + w_{i+1} + w_{i+1} + w_{i+1}"
    },
    {
      id: "b",
      latex: "B = v + v + v + w_{i+1} + w_{i+1} + w_{i+1} + v_i + v_i + v_i"
    }
  ],
  variables: {
    v: {
      input: "drag",
      default: 2,
      range: [0, 10],
      precision: 1,
      filter: [
        { formula: ["a"], instance: [1, 3] },
        { formula: ["b"], instance: [2] }
      ],
      exclude: [
        { formula: ["a"], instance: [3] }
      ],
      defaultCSS: "color: #0f766e; background: rgba(20, 184, 166, 0.14); border: 1px solid rgba(13, 148, 136, 0.45); border-radius: 4px; padding: 0 4px; font-weight: 700;",
      hoverCSS: "color: #115e59; background: rgba(20, 184, 166, 0.28); border-color: #0d9488;"
    },
    "v_i": {
      input: "drag",
      default: 3,
      range: [0, 10],
      precision: 1,
      latexDisplay: "value",
      filter: [
        { formula: ["a"], instance: [2] },
        { formula: ["b"], instance: [1, 3] }
      ],
      exclude: [
        { formula: ["b"], instance: [3] }
      ],
      defaultCSS: "color: #1d4ed8; background: rgba(59, 130, 246, 0.14); border: 1px solid rgba(37, 99, 235, 0.45); border-radius: 4px; padding: 0 4px; font-weight: 700;",
      hoverCSS: "color: #1e40af; background: rgba(59, 130, 246, 0.28); border-color: #2563eb;"
    },
    "w_{i+1}": {
      input: "drag",
      default: 4,
      range: [0, 10],
      precision: 1,
      latexDisplay: "value",
      filter: [
        { formula: ["a"], instance: [3] },
        { formula: ["b"], instance: [1, 2] }
      ],
      exclude: [
        { formula: ["b"], instance: [1] }
      ],
      defaultCSS: "color: #7e22ce; background: rgba(168, 85, 247, 0.14); border: 1px solid rgba(147, 51, 234, 0.45); border-radius: 4px; padding: 0 4px; font-weight: 700;",
      hoverCSS: "color: #6b21a8; background: rgba(168, 85, 247, 0.28); border-color: #9333ea;"
    }
  },
  fontSize: 1.5
};`;
