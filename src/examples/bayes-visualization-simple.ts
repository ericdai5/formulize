export const bayesSimpleVisualization = `const config = {
    formulas: [
      {
        id: "a-and-not-b",
        latex: "P(A \\\\cap \\\\neg B) = P(A) - P(A \\\\cap B)"
      },
      {
        id: "b-and-not-a",
        latex: "P(B \\\\cap \\\\neg A) = P(B) - P(A \\\\cap B)"
      },
      {
        id: "not-a-and-not-b",
        latex: "P(\\\\neg A \\\\cap \\\\neg B) = 1 - P(A) - P(B) + P(A \\\\cap B)"
      },
    ],
    variables: {
      "P(A \\\\cap B)": {
        input: "drag",
        default: 0.1,
        range: [0, 1],
        name: "P(A and B)"
      },
      "P(A \\\\cap \\\\neg B)": {
        name: "P(A and not B)"
      },
      "P(B \\\\cap \\\\neg A)": {
        name: "P(B and not A)"
      },
      "P(\\\\neg A \\\\cap \\\\neg B)": {
        name: "P(not A and not B)"
      },
      "P(B)": {
        input: "drag",
        default: 0.2,
        range: [0, 1],
        name: "P(B)"
      },
      "P(A)": {
        input: "drag",
        default: 0.2,
        range: [0, 1],
        name: "P(A)"
      }
    },
    semantics: function({ vars }) {
      const maxValidJoint = Math.min(vars["P(A)"], vars["P(B)"]);
      const clampedJoint = Math.min(vars["P(A \\\\cap B)"], maxValidJoint);
      vars["P(A \\\\cap B)"] = clampedJoint;
      vars["P(A \\\\cap \\\\neg B)"] = vars["P(A)"] - clampedJoint;
      vars["P(B \\\\cap \\\\neg A)"] = vars["P(B)"] - clampedJoint;
      vars["P(\\\\neg A \\\\cap \\\\neg B)"] = 1 - vars["P(A)"] - vars["P(B)"] + clampedJoint;
    },
  };`;
