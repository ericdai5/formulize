const bayesTheoremExample = `const config = {
    formulas: [
      {
        name: "Bayes' Theorem",
        function: "P(B\\\\mid A) = \\\\frac{P(A\\\\mid B)P(B)}{P(A)}",
        expression: "{P(B\\\\mid A)} = ({P(A\\\\mid B)} * {P(B)}) / {P(A)}"
      }
    ],
    variables: {
      "P(B\\\\mid A)": {
        type: "dependent",
        label: "P(B|A)",
        precision: 4
      },
      "P(A\\\\mid B)": {
        type: "input",
        value: 0.5,
        range: [0, 1],
        label: "P(A|B)"
      },
      "P(B)": {
        type: "input",
        value: 0.3,
        range: [0, 1],
        label: "P(B)"
      },
      "P(A)": {
        type: "input",
        value: 0.4,
        range: [0, 1],
        label: "P(A)"
      }
    },
    computation: {
      engine: "symbolic-algebra"
    }
  };
  
  const formula = await Formulize.create(config);`;

export default bayesTheoremExample;
