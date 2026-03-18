import { INPUT_VARIABLE_DEFAULT } from "../types/variable";

const MAX_TO_FIXED_PRECISION = 20;
const MIN_SIGNIFICANT_DIGITS = 1;
const MAX_SIGNIFICANT_DIGITS = 100;

export interface NumberFormatOptions {
  precision?: number;
  sigFigs?: number;
}

function normalizePrecision(precision?: number): number {
  if (!Number.isFinite(precision)) {
    return INPUT_VARIABLE_DEFAULT.PRECISION;
  }

  return Math.min(
    MAX_TO_FIXED_PRECISION,
    Math.max(0, Math.floor(precision as number))
  );
}

function normalizeSignificantDigits(
  sigFigs?: number
): number | undefined {
  if (!Number.isFinite(sigFigs)) {
    return undefined;
  }

  return Math.min(
    MAX_SIGNIFICANT_DIGITS,
    Math.max(MIN_SIGNIFICANT_DIGITS, Math.floor(sigFigs as number))
  );
}

function normalizeSignedZero(value: string): string {
  return Object.is(Number(value), -0) ? value.slice(1) : value;
}

function scientificToLatex(value: string): string {
  const match = value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))e([+-]?\d+)$/i);
  if (!match) {
    return value;
  }

  const mantissa = match[1];
  const exponent = Number(match[2]);
  return `${mantissa}\\times 10^{${exponent}}`;
}

export function formatNumberForDisplay(
  value: number,
  options: NumberFormatOptions = {}
): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  const sigFigs = normalizeSignificantDigits(options.sigFigs);
  if (sigFigs !== undefined) {
    return value.toPrecision(sigFigs);
  }

  const precision = normalizePrecision(options.precision);
  return normalizeSignedZero(value.toFixed(precision));
}

export function formatNumberForLatex(
  value: number,
  options: NumberFormatOptions = {}
): string {
  return scientificToLatex(formatNumberForDisplay(value, options));
}
