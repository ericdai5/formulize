createFormula("kinetic-energy")
  .equation("K = \\frac{1}{2}mv^2")
  .dependent({
    K: {
      units: "J",
      label: "kinetic energy", // can make optional
      precision: 1
    }
  })
  .constant({ // "constant" means "fixed"
    m: {
      value: 1,
      units: "kg", 
      label: "mass",
      precision: 2
    }
  })
  .input({ // "input" means "slideable"
    v: {
      initialValue: 1,
      range: [-10, 10],
      step: 0.1,
      units: "m/s",
      label: "velocity",
    }
  });

// distill example
createFormula("momentum-curves")
  .equation("c_1p_1 + c_2p_2 + c_3p_3 + c_4p_4 + c_5p_5 + c_6p_6 = model")
  .input({
    c1: { initial: 1, range: [-10, 10], step: 0.1, label: "coefficient 1" },
    c2: { initial: 1, range: [-10, 10], step: 0.1, label: "coefficient 2" },
    c3: { initial: 1, range: [-10, 10], step: 0.1, label: "coefficient 3" }, 
    c4: { initial: 1, range: [-10, 10], step: 0.1, label: "coefficient 4" },
    c5: { initial: 1, range: [-10, 10], step: 0.1, label: "coefficient 5" },
    c6: { initial: 1, range: [-10, 10], step: 0.1, label: "coefficient 6" }
  })
  .renderGraphs({
    terms: [
      { fn: (x, c) => c * x,      label: "p1" },
      { fn: (x, c) => c * x**2,   label: "p2" },
      { fn: (x, c) => c * x**3,   label: "p3" },
      { fn: (x, c) => c * x**4,   label: "p4" },
      { fn: (x, c) => c * x**5,   label: "p5" },
      { fn: (x, c) => c * x**6,   label: "p6" },
      { fn: (x, c) => c * x + c * x**2 + c * x**3 + c * x**4 + c * x**5 + c * x**6, label: "model" }
    ],

    graphs: {
      // TODO: individual graphs

      // TODO: combined graph
    },

    axes: {
      x: { 
        domain: [-5, 5], 
        label: "x",
        ticks: 11
      },
      y: { 
        domain: [-10, 10], 
        label: "y",
        ticks: 21
      }
    }
  })

  .handleInteractions({
    // when coefficients are scrubbed, update the graphs (and maybe the equation?)
    coefficientChange: (coeffs) => {
      updateGraphs(coeffs);
      updateEquation(coeffs);
    },

  });