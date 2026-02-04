export const bayesWithCustomVisualization = `const config = {
    formulas: [
      {
        id: "bayes-theorem",
        latex: "P(B \\\\mid A) = \\\\frac{P(A \\\\mid B)P(B)}{P(A)}"
      },
      {
        id: "conditional-probability",
        latex: "P(A \\\\mid B) = \\\\frac{P(A \\\\cap B)}{P(B)}"
      },
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
      "P(B \\\\mid A)": {
        name: "P(B|A)",
        precision: 4
      },
      "P(A \\\\mid B)": {
        name: "P(A|B)"
      },
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
      const EPS = 1e-6;
      
      // Clamp P(A ∩ B) to valid range: must be ≤ min(P(A), P(B)) to avoid negative probabilities
      const maxValidJoint = Math.min(vars["P(A)"], vars["P(B)"]);
      const clampedJoint = Math.min(vars["P(A \\\\cap B)"], maxValidJoint);
      vars["P(A \\\\cap B)"] = clampedJoint;
      
      // Compute P(A|B) only when P(B) > EPS to avoid division by zero
      if (vars["P(B)"] > EPS) {
        vars["P(A \\\\mid B)"] = clampedJoint / vars["P(B)"];
      } else {
        vars["P(A \\\\mid B)"] = 0;
      }
      
      // Compute P(B|A) only when P(A) > EPS to avoid division by zero
      if (vars["P(A)"] > EPS) {
        vars["P(B \\\\mid A)"] = (vars["P(A \\\\mid B)"] * vars["P(B)"]) / vars["P(A)"];
      } else {
        vars["P(B \\\\mid A)"] = 0;
      }
      
      // Use clamped joint value for all downstream calculations to ensure non-negative results
      vars["P(A \\\\cap \\\\neg B)"] = vars["P(A)"] - clampedJoint;
      vars["P(B \\\\cap \\\\neg A)"] = vars["P(B)"] - clampedJoint;
      vars["P(\\\\neg A \\\\cap \\\\neg B)"] = 1 - vars["P(A)"] - vars["P(B)"] + clampedJoint;
    },
    visualizations: [
      {
        type: "custom",
        id: "bayes-visualization",
        title: "Interactive Probability Visualization",
        width: 600,
        height: 400,
        component: "BayesProbabilityChart",
        update: {
          onVariableChange: true
        }
      }
    ],
    fontSize: 1.5
  };`;
