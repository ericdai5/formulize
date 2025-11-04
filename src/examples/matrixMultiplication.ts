export const matrixMultiplication = `const config = {
  formulas: [
    {
      formulaId: "matrix-multiplication",
      latex: "\\\\begin{bmatrix} {a_{11}} & {a_{12}} & {a_{13}} \\\\\\\\ {a_{21}} & {a_{22}} & {a_{23}} \\\\\\\\ {a_{31}} & {a_{32}} & {a_{33}} \\\\end{bmatrix} \\\\begin{bmatrix} {b_{11}} & {b_{12}} & {b_{13}} \\\\\\\\ {b_{21}} & {b_{22}} & {b_{23}} \\\\\\\\ {b_{31}} & {b_{32}} & {b_{33}} \\\\end{bmatrix} = \\\\begin{bmatrix} {c_{11}} & {c_{12}} & {c_{13}} \\\\\\\\ {c_{21}} & {c_{22}} & {c_{23}} \\\\\\\\ {c_{31}} & {c_{32}} & {c_{33}} \\\\end{bmatrix}",
      manual: (variables) => {
        // Matrix A
        const a11 = variables["a_{11}"]?.value || 0;
        const a12 = variables["a_{12}"]?.value || 0;
        const a13 = variables["a_{13}"]?.value || 0;
        const a21 = variables["a_{21}"]?.value || 0;
        const a22 = variables["a_{22}"]?.value || 0;
        const a23 = variables["a_{23}"]?.value || 0;
        const a31 = variables["a_{31}"]?.value || 0;
        const a32 = variables["a_{32}"]?.value || 0;
        const a33 = variables["a_{33}"]?.value || 0;

        // Matrix B
        const b11 = variables["b_{11}"]?.value || 0;
        const b12 = variables["b_{12}"]?.value || 0;
        const b13 = variables["b_{13}"]?.value || 0;
        const b21 = variables["b_{21}"]?.value || 0;
        const b22 = variables["b_{22}"]?.value || 0;
        const b23 = variables["b_{23}"]?.value || 0;
        const b31 = variables["b_{31}"]?.value || 0;
        const b32 = variables["b_{32}"]?.value || 0;
        const b33 = variables["b_{33}"]?.value || 0;

        // Matrix multiplication C = A * B
        variables["c_{11}"].value = a11 * b11 + a12 * b21 + a13 * b31;
        variables["c_{12}"].value = a11 * b12 + a12 * b22 + a13 * b32;
        variables["c_{13}"].value = a11 * b13 + a12 * b23 + a13 * b33;

        variables["c_{21}"].value = a21 * b11 + a22 * b21 + a23 * b31;
        variables["c_{22}"].value = a21 * b12 + a22 * b22 + a23 * b32;
        variables["c_{23}"].value = a21 * b13 + a22 * b23 + a23 * b33;

        variables["c_{31}"].value = a31 * b11 + a32 * b21 + a33 * b31;
        variables["c_{32}"].value = a31 * b12 + a32 * b22 + a33 * b32;
        variables["c_{33}"].value = a31 * b13 + a32 * b23 + a33 * b33;
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
      type: "slider",
      variable: "a_{11}"
    },
    {
      type: "slider",
      variable: "a_{12}"
    },
    {
      type: "slider",
      variable: "a_{22}"
    }
  ],
  computation: {
    engine: "manual"
  },
  fontSize: 0.5,
  labelFontSize: 0.6
};`;
