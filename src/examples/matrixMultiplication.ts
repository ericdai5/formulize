export const matrixMultiplication = `const config = {
  formulas: [
    {
      formulaId: "matrix-multiplication",
      latex: "\\\\begin{bmatrix} {a_{11}} & {a_{12}} & {a_{13}} \\\\\\\\ {a_{21}} & {a_{22}} & {a_{23}} \\\\\\\\ {a_{31}} & {a_{32}} & {a_{33}} \\\\end{bmatrix} \\\\begin{bmatrix} {b_{11}} & {b_{12}} & {b_{13}} \\\\\\\\ {b_{21}} & {b_{22}} & {b_{23}} \\\\\\\\ {b_{31}} & {b_{32}} & {b_{33}} \\\\end{bmatrix} = \\\\begin{bmatrix} {c_{11}} & {c_{12}} & {c_{13}} \\\\\\\\ {c_{21}} & {c_{22}} & {c_{23}} \\\\\\\\ {c_{31}} & {c_{32}} & {c_{33}} \\\\end{bmatrix}",
      manual: (vars) => {
        // Matrix A
        const a11 = vars["a_{11}"] || 0;
        const a12 = vars["a_{12}"] || 0;
        const a13 = vars["a_{13}"] || 0;
        const a21 = vars["a_{21}"] || 0;
        const a22 = vars["a_{22}"] || 0;
        const a23 = vars["a_{23}"] || 0;
        const a31 = vars["a_{31}"] || 0;
        const a32 = vars["a_{32}"] || 0;
        const a33 = vars["a_{33}"] || 0;

        // Matrix B
        const b11 = vars["b_{11}"] || 0;
        const b12 = vars["b_{12}"] || 0;
        const b13 = vars["b_{13}"] || 0;
        const b21 = vars["b_{21}"] || 0;
        const b22 = vars["b_{22}"] || 0;
        const b23 = vars["b_{23}"] || 0;
        const b31 = vars["b_{31}"] || 0;
        const b32 = vars["b_{32}"] || 0;
        const b33 = vars["b_{33}"] || 0;

        // Matrix multiplication C = A * B
        vars["c_{11}"] = a11 * b11 + a12 * b21 + a13 * b31;
        vars["c_{12}"] = a11 * b12 + a12 * b22 + a13 * b32;
        vars["c_{13}"] = a11 * b13 + a12 * b23 + a13 * b33;
        vars["c_{21}"] = a21 * b11 + a22 * b21 + a23 * b31;
        vars["c_{22}"] = a21 * b12 + a22 * b22 + a23 * b32;
        vars["c_{23}"] = a21 * b13 + a22 * b23 + a23 * b33;
        vars["c_{31}"] = a31 * b11 + a32 * b21 + a33 * b31;
        vars["c_{32}"] = a31 * b12 + a32 * b22 + a33 * b32;
        vars["c_{33}"] = a31 * b13 + a32 * b23 + a33 * b33;
      }
    }
  ],
  variables: {
    // Matrix A (3x3)
    "a_{11}": { type: "input", value: 1, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "a_{12}": { type: "input", value: 2, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "a_{13}": { type: "input", value: 0, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "a_{21}": { type: "input", value: 0, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "a_{22}": { type: "input", value: 1, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "a_{23}": { type: "input", value: 1, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "a_{31}": { type: "input", value: 3, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "a_{32}": { type: "input", value: 0, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "a_{33}": { type: "input", value: 2, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },

    // Matrix B (3x3)
    "b_{11}": { type: "input", value: 2, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "b_{12}": { type: "input", value: 1, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "b_{13}": { type: "input", value: 0, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "b_{21}": { type: "input", value: 0, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "b_{22}": { type: "input", value: 1, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "b_{23}": { type: "input", value: 2, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "b_{31}": { type: "input", value: 1, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "b_{32}": { type: "input", value: 0, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "b_{33}": { type: "input", value: 1, range: [-5, 5], step: 1, precision: 0, latexDisplay: "value", labelDisplay: "none" },

    // Matrix C (3x3 result)
    "c_{11}": { type: "dependent", precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "c_{12}": { type: "dependent", precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "c_{13}": { type: "dependent", precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "c_{21}": { type: "dependent", precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "c_{22}": { type: "dependent", precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "c_{23}": { type: "dependent", precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "c_{31}": { type: "dependent", precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "c_{32}": { type: "dependent", precision: 0, latexDisplay: "value", labelDisplay: "none" },
    "c_{33}": { type: "dependent", precision: 0, latexDisplay: "value", labelDisplay: "none" }
  },
  controls: [
    {
      type: "radio",
      variable: "a_{11}",
      orientation: "horizontal"
    },
    {
      type: "radio",
      variable: "a_{12}",
      orientation: "horizontal"
    },
    {
      type: "radio",
      variable: "b_{22}",
      orientation: "horizontal"
    },
    {
      type: "button",
      label: "Reset All to Zero",
      code: (vars) => {
        vars["a_{11}"] = 0;
        vars["a_{12}"] = 0;
        vars["a_{13}"] = 0;
        vars["a_{21}"] = 0;
        vars["a_{22}"] = 0;
        vars["a_{23}"] = 0;
        vars["a_{31}"] = 0;
        vars["a_{32}"] = 0;
        vars["a_{33}"] = 0;
        vars["b_{11}"] = 0;
        vars["b_{12}"] = 0;
        vars["b_{13}"] = 0;
        vars["b_{21}"] = 0;
        vars["b_{22}"] = 0;
        vars["b_{23}"] = 0;
        vars["b_{31}"] = 0;
        vars["b_{32}"] = 0;
        vars["b_{33}"] = 0;
      }
    },
    {
      type: "button",
      label: "Identity Matrix A",
      code: function(vars) {
        vars["a_{11}"] = 1;
        vars["a_{12}"] = 0;
        vars["a_{13}"] = 0;
        vars["a_{21}"] = 0;
        vars["a_{22}"] = 1;
        vars["a_{23}"] = 0;
        vars["a_{31}"] = 0;
        vars["a_{32}"] = 0;
        vars["a_{33}"] = 1;
      }
    }
  ],
  computation: {
    engine: "manual"
  },
  fontSize: 0.5,
  labelFontSize: 0.6
};`;
