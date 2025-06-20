export const summationBasic = `const config = {
  formulas: [
    {
      name: "Summation Basic",
      function: "E = \\\\sum_{x \\\\in X} x P(x)",
      expression: "{result} = {sum}"
    }
  ],
  variables: {
    E: {
      type: "dependent",
      label: "Expected Value",
      precision: 2
    },
    x: {
      type: "input",
      value: 1,
      range: [1, 100],
      label: "x",
      precision: 0
    },
    "P(x)": {
      type: "input",
      value: 0.1,
      range: [0, 1],
      label: "P(x)"
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },
  fontSize: 0.7
};

const formula = await Formulize.create(config);
`;
