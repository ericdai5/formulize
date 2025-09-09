export const bayesWithCustomVisualization = `const config = {
    formulas: [
      {
        formulaId: "bayes-theorem",
        function: "P(B \\\\mid A) = \\\\frac{P(A \\\\mid B)P(B)}{P(A)}",
        expression: "{P(B \\\\mid A)} = ({P(A \\\\mid B)} * {P(B)}) / {P(A)}"
      },
      {
        formulaId: "conditional-probability",
        function: "P(A \\\\mid B) = \\\\frac{P(A \\\\cap B)}{P(B)}",
        expression: "{P(A \\\\mid B)} = {P(A \\\\cap B)} / {P(B)}"
      },
      {
        formulaId: "a-and-not-b",
        function: "P(A \\\\cap \\\\neg B) = P(A) - P(A \\\\cap B)",
        expression: "{P(A \\\\cap \\\\neg B)} = {P(A)} - {P(A \\\\cap B)}"
      },
      {
        formulaId: "b-and-not-a",
        function: "P(B \\\\cap \\\\neg A) = P(B) - P(A \\\\cap B)",
        expression: "{P(B \\\\cap \\\\neg A)} = {P(B)} - {P(A \\\\cap B)}"
      },
      {
        formulaId: "not-a-and-not-b",
        function: "P(\\\\neg A \\\\cap \\\\neg B) = 1 - P(A) - P(B) + P(A \\\\cap B)",
        expression: "{P(\\\\neg A \\\\cap \\\\neg B)} = 1 - {P(A)} - {P(B)} + {P(A \\\\cap B)}"
      },
    ],
    variables: {
      "P(B \\\\mid A)": {
        type: "dependent",
        name: "P(B|A)",
        precision: 4
      },
      "P(A \\\\mid B)": {
        type: "dependent",
        name: "P(A|B)"
      },
      "P(A \\\\cap B)": {
        type: "input",
        value: 0.1,
        range: [0, 1],
        name: "P(A and B)"
      },
      "P(A \\\\cap \\\\neg B)": {
        type: "dependent",
        name: "P(A and not B)"
      },
      "P(B \\\\cap \\\\neg A)": {
        type: "dependent",
        name: "P(B and not A)"
      },
      "P(\\\\neg A \\\\cap \\\\neg B)": {
        type: "dependent",
        name: "P(not A and not B)"
      },
      "P(B)": {
        type: "input",
        value: 0.2,
        range: [0, 1],
        name: "P(B)"
      },
      "P(A)": {
        type: "input",
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
        formulaId: "bayes-theorem",
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
