import { formatNumberForLatex } from "./format-number";

export interface LatexNumberFormatter {
  precision: (precision: number) => string;
  sigfigs: (sigFigs: number) => string;
}

function wrapMathMode(latex: string): string {
  return `$$${latex}$$`;
}

/**
 * Helper API for step label values that should render as math.
 * Usage:
 * `latex(value).precision(2)` or `latex(value).sigfigs(4)`
 */
export function latex(value: number): LatexNumberFormatter {
  const numericValue = Number(value);

  const sigFigFormatter = (sigFigs: number) =>
    wrapMathMode(formatNumberForLatex(numericValue, { sigFigs }));

  return {
    precision: (precision: number) =>
      wrapMathMode(formatNumberForLatex(numericValue, { precision })),
    sigfigs: sigFigFormatter,
  };
}
