export const taylorSeries = `const config = {
  formulas: [
    {
      name: "Taylor Series",
      function: "f(a) + \\\\frac{f'(a)}{1!}(x-a) + \\\\frac{f''(a)}{2!}(x-a)^2 + \\\\cdots = \\\\sum_{n=0}^{\\\\infty} \\\\frac{f^{(n)}(a)}{n!}(x-a)^n",
      manual: function(variables) {
        var a = variables.a.value;
        var x = variables.x.value;
        var terms = variables.terms.value;
        var result = 0;
        // Calculate Taylor series for e^x around point a
        for (var n = 0; n < terms; n++) {
          var factorial = 1;
          for (var i = 1; i <= n; i++) {
            factorial *= i;
          }
          // @view factorial->factorial n->n
          var derivative = Math.exp(a); // e^x derivative is always e^x
          var term = (derivative / factorial) * Math.pow(x - a, n);
          // @view derivative->f_n_a term->term_n
          result += term;
          // @view result->f_x
        }
        return result;
      },
    },
  ],
  variables: {
    "f(x)": {
      type: "dependent",
      precision: 4
    },
    a: {
      type: "input",
      value: 0,
      precision: 1
    },
    x: {
      type: "input",
      value: 1,
      precision: 1
    },
    terms: {
      type: "input",
      value: 5,
      precision: 0
    },
    factorial: {
      type: "dependent",
      precision: 0
    },
    n: {
      type: "dependent",
      precision: 0
    },
    "f_n_a": {
      type: "dependent",
      precision: 4
    },
    "term_n": {
      type: "dependent",
      precision: 4
    }
  },
  computation: {
    engine: "manual",
    mode: "step"
  },
  fontSize: 0.7
};

const formula = await Formulize.create(config);
`;
