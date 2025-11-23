export const bayesWithCustomVisualization = `const config = {
    formulas: [
      {
        id: "bayes-theorem",
        latex: "P(B \\\\mid A) = \\\\frac{P(A \\\\mid B)P(B)}{P(A)}",
        expression: "{P(B \\\\mid A)} = ({P(A \\\\mid B)} * {P(B)}) / {P(A)}"
      },
      {
        id: "conditional-probability",
        latex: "P(A \\\\mid B) = \\\\frac{P(A \\\\cap B)}{P(B)}",
        expression: "{P(A \\\\mid B)} = {P(A \\\\cap B)} / {P(B)}"
      },
      {
        id: "a-and-not-b",
        latex: "P(A \\\\cap \\\\neg B) = P(A) - P(A \\\\cap B)",
        expression: "{P(A \\\\cap \\\\neg B)} = {P(A)} - {P(A \\\\cap B)}"
      },
      {
        id: "b-and-not-a",
        latex: "P(B \\\\cap \\\\neg A) = P(B) - P(A \\\\cap B)",
        expression: "{P(B \\\\cap \\\\neg A)} = {P(B)} - {P(A \\\\cap B)}"
      },
      {
        id: "not-a-and-not-b",
        latex: "P(\\\\neg A \\\\cap \\\\neg B) = 1 - P(A) - P(B) + P(A \\\\cap B)",
        expression: "{P(\\\\neg A \\\\cap \\\\neg B)} = 1 - {P(A)} - {P(B)} + {P(A \\\\cap B)}"
      },
    ],
    variables: {
      "P(B \\\\mid A)": {
        role: "dependent",
        name: "P(B|A)",
        precision: 4
      },
      "P(A \\\\mid B)": {
        role: "dependent",
        name: "P(A|B)"
      },
      "P(A \\\\cap B)": {
        role: "input",
        value: 0.1,
        range: [0, 1],
        name: "P(A and B)"
      },
      "P(A \\\\cap \\\\neg B)": {
        role: "dependent",
        name: "P(A and not B)"
      },
      "P(B \\\\cap \\\\neg A)": {
        role: "dependent",
        name: "P(B and not A)"
      },
      "P(\\\\neg A \\\\cap \\\\neg B)": {
        role: "dependent",
        name: "P(not A and not B)"
      },
      "P(B)": {
        role: "input",
        value: 0.2,
        range: [0, 1],
        name: "P(B)"
      },
      "P(A)": {
        role: "input",
        value: 0.2,
        range: [0, 1],
        name: "P(A)"
      }
    },
    computation: {
      engine: "symbolic-algebra"
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
    fontSize: 0.6
  };`;
