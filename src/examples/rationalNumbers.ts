const rationalNumbers = `const config = {
  formulas: [
    {
      name: "Rational Numbers Set",
      function: "Q = \\\\{\\\\frac{p}{q} \\\\mid p \\\\in Z \\\\text{ and } q \\\\in Z \\\\text{ and } q \\\\neq 0\\\\}",
      expression: "{result} = {p} / {q}"
    }
  ],
  variables: {
    Q: {
      type: "dependent",
      label: "Rational Number",
      precision: 4
    },
    p: {
      type: "input",
      value: 1,
      range: [-20, 20],
      step: 1,
      label: "Numerator (p ∈ Z)"
    },
    q: {
      type: "input",
      value: 2,
      range: [-20, 20],
      step: 1,
      label: "Denominator (q ∈ Z, q ≠ 0)",
      constraint: "q !== 0"
    }
  },
  computation: {
    engine: "symbolic-algebra"
  },
};

const formula = await Formulize.create(config);`;

export default rationalNumbers;
