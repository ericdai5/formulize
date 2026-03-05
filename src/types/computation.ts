import { ISampleFn } from "./graph";
import { IStepInput } from "./step";

/**
 * Step function type for step-through debugging.
 */
export type IStepFn = (config: IStepInput, blockId?: string) => void;

/**
 * Formatter object returned by `latex(value)`.
 * Terminal methods return plain strings, so chaining is intentionally not possible.
 */
export interface ILatexFormatter {
  precision: (precision: number) => string;
  sigfigs: (sigFigs: number) => string;
}

/**
 * Math-mode number formatter helper for step labels.
 * Example: `latex(value).precision(2)` or `latex(value).sigfigs(4)`.
 */
export type ILatexFn = (value: number) => ILatexFormatter;

/**
 * Context object passed to semantics functions.
 * Users can destructure only the properties they need.
 * @property vars - Proxy object for reading/writing variable values
 * @property sample - Function to collect visualization data points: sample("id", {x, y, z?})
 * @property step - Function for step-through debugging breakpoints
 * @property latex - Number formatter for math-mode step labels: latex(value).precision(2)
 */
export interface ISemanticsContext {
  vars: Record<string, any>;
  sample: ISampleFn;
  step: IStepFn;
  latex: ILatexFn;
}

/**
 * Semantics function type.
 * Receives a context object with variable values and data collection functions.
 * Users can destructure only what they need: ({ vars, sample }) => { ... }
 */
export type ISemantics = (ctx: ISemanticsContext) => void;
