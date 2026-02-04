/**
 * Programmatic Formula and Variable Generators
 *
 * General-purpose utilities for generating formulas and variables programmatically.
 * Designed to compose naturally with the declarative FormulizeConfig style.
 *
 * @example
 * ```typescript
 * import { Formula, Variable } from "formulize-math";
 *
 * const config: FormulizeConfig = {
 *   formulas: [
 *     { id: "static", latex: "E = mc^2" },
 *     ...Formula.loop({ i: [1, 3] }, ({ i }) => ({
 *       id: `f_${i}`,
 *       latex: `x_{${i}} = ${i}`,
 *     })),
 *   ],
 *   variables: {
 *     c: 299792458,
 *     ...Variable.grid("w", 3, 4, { interaction: "drag", range: [-1, 1] }),
 *   },
 * };
 * ```
 */
import { IFormula } from "../types/formula";
import { IVariableUserInput, IVariablesUserInput } from "../types/variable";

// ============================================================================
// Types
// ============================================================================

/**
 * Range specification for loop iterations.
 * Can be:
 * - A number: [1, n] inclusive
 * - A tuple [start, end]: inclusive range
 * - An array of specific values
 */
export type LoopRange = number | [number, number] | number[];

/**
 * Specification for loop iteration bounds.
 * Keys are variable names, values define the iteration range.
 */
export type LoopSpec = Record<string, LoopRange>;

/**
 * Context passed to generator callbacks.
 * Contains the current iteration values for each loop variable.
 */
export type LoopContext<T extends LoopSpec> = {
  [K in keyof T]: number;
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Expand a LoopRange into an array of values
 */
function expandRange(range: LoopRange): number[] {
  if (typeof range === "number") {
    // [1, n] inclusive
    return Array.from({ length: range }, (_, i) => i + 1);
  }
  if (
    Array.isArray(range) &&
    range.length === 2 &&
    typeof range[0] === "number" &&
    typeof range[1] === "number"
  ) {
    // [start, end] inclusive - but need to check if it's a tuple or explicit array
    // If it looks like [1, 5] we treat as range, otherwise as explicit values
    const [start, end] = range;
    if (Number.isInteger(start) && Number.isInteger(end) && end >= start) {
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
  }
  // Explicit array of values
  return range as number[];
}

/**
 * Generate all combinations of loop variable values
 */
function generateCombinations<T extends LoopSpec>(spec: T): LoopContext<T>[] {
  const keys = Object.keys(spec) as (keyof T)[];
  if (keys.length === 0) return [{}] as LoopContext<T>[];

  const ranges = keys.map((key) => expandRange(spec[key] as LoopRange));
  const combinations: LoopContext<T>[] = [];

  function recurse(index: number, current: Partial<LoopContext<T>>) {
    if (index === keys.length) {
      combinations.push({ ...current } as LoopContext<T>);
      return;
    }

    const key = keys[index];
    const values = ranges[index];
    for (const value of values) {
      current[key] = value as LoopContext<T>[keyof T];
      recurse(index + 1, current);
    }
  }

  recurse(0, {});
  return combinations;
}

// ============================================================================
// Formula Generators
// ============================================================================

export const Formula = {
  /**
   * Generate formulas by iterating over specified ranges.
   *
   * @param spec - Object defining loop variables and their ranges
   * @param generator - Function that generates a formula for each combination
   * @returns Array of formulas
   *
   * @example
   * // Generate formulas for a 3-layer network with 4 units each
   * Formula.loop({ layer: [1, 3], unit: [1, 4] }, ({ layer, unit }) => ({
   *   id: `h_${unit}_${layer}`,
   *   latex: `h_{${unit}}^{(${layer})} = \\text{ReLU}(z_{${unit}}^{(${layer})})`,
   * }))
   *
   * @example
   * // Generate with explicit values
   * Formula.loop({ i: [1, 2, 3, 5, 8] }, ({ i }) => ({
   *   id: `fib_${i}`,
   *   latex: `F_{${i}}`,
   * }))
   */
  loop<T extends LoopSpec>(
    spec: T,
    generator: (context: LoopContext<T>, index: number) => IFormula
  ): IFormula[] {
    const combinations = generateCombinations(spec);
    return combinations.map((ctx, index) => generator(ctx, index));
  },

  /**
   * Generate a single formula with template substitution.
   *
   * @param id - Formula ID (can include ${} placeholders)
   * @param latex - LaTeX string (can include ${} placeholders)
   * @param values - Object of values to substitute
   * @returns A single formula
   *
   * @example
   * Formula.template("kinetic_${n}", "K_{${n}} = \\frac{1}{2}m_{${n}}v_{${n}}^2", { n: 1 })
   */
  template(
    id: string,
    latex: string,
    values: Record<string, string | number>
  ): IFormula {
    let processedId = id;
    let processedLatex = latex;
    for (const [key, value] of Object.entries(values)) {
      const pattern = new RegExp(`\\$\\{${key}\\}`, "g");
      processedId = processedId.replace(pattern, String(value));
      processedLatex = processedLatex.replace(pattern, String(value));
    }
    return { id: processedId, latex: processedLatex };
  },

  /**
   * Create a formula directly (identity function for consistency).
   */
  create(id: string, latex: string): IFormula {
    return { id, latex };
  },
};

// ============================================================================
// Variable Generators
// ============================================================================

export const Variable = {
  /**
   * Generate variables by iterating over specified ranges.
   *
   * @param spec - Object defining loop variables and their ranges
   * @param generator - Function that generates [id, variable] pairs
   * @returns Object of variables
   *
   * @example
   * // Generate weight variables
   * Variable.loop({ i: [1, 4], j: [1, 3] }, ({ i, j }) => [
   *   `w_${i}_${j}`,
   *   { interaction: "drag", default: Math.random() - 0.5, range: [-2, 2] }
   * ])
   */
  loop<T extends LoopSpec>(
    spec: T,
    generator: (
      context: LoopContext<T>,
      index: number
    ) => [string, number | IVariableUserInput]
  ): IVariablesUserInput {
    const combinations = generateCombinations(spec);
    const result: IVariablesUserInput = {};
    combinations.forEach((ctx, index) => {
      const [id, variable] = generator(ctx, index);
      result[id] = variable;
    });
    return result;
  },

  /**
   * Generate a grid of variables with naming pattern `{prefix}_{i}_{j}`.
   *
   * @param prefix - Variable name prefix
   * @param rows - Number of rows (or [startRow, endRow])
   * @param cols - Number of columns (or [startCol, endCol])
   * @param config - Variable configuration to apply to all
   * @returns Object of variables
   *
   * @example
   * // Generate 4x3 weight matrix
   * Variable.grid("w", 4, 3, { interaction: "drag", range: [-1, 1] })
   * // Produces: { w_1_1: {...}, w_1_2: {...}, ..., w_4_3: {...} }
   *
   * @example
   * // With random initialization
   * Variable.grid("w", 4, 3, {
   *   interaction: "drag",
   *   range: [-1, 1],
   *   default: () => Math.random() * 2 - 1
   * })
   */
  grid(
    prefix: string,
    rows: number | [number, number],
    cols: number | [number, number],
    config: Omit<IVariableUserInput, "default"> & {
      default?: number | (() => number);
    }
  ): IVariablesUserInput {
    const rowRange = expandRange(rows);
    const colRange = expandRange(cols);
    const result: IVariablesUserInput = {};

    for (const i of rowRange) {
      for (const j of colRange) {
        const id = `${prefix}_${i}_${j}`;
        const defaultValue =
          typeof config.default === "function"
            ? config.default()
            : config.default;
        result[id] = {
          ...config,
          default: defaultValue,
        };
      }
    }

    return result;
  },

  /**
   * Generate a vector of variables with naming pattern `{prefix}_{i}`.
   *
   * @param prefix - Variable name prefix
   * @param length - Number of elements (or [start, end] range)
   * @param config - Variable configuration to apply to all
   * @returns Object of variables
   *
   * @example
   * // Generate input vector
   * Variable.vector("x", 3, { interaction: "drag", default: 0.5 })
   * // Produces: { x_1: {...}, x_2: {...}, x_3: {...} }
   */
  vector(
    prefix: string,
    length: number | [number, number],
    config: Omit<IVariableUserInput, "default"> & {
      default?: number | (() => number);
    }
  ): IVariablesUserInput {
    const indices = expandRange(length);
    const result: IVariablesUserInput = {};

    for (const i of indices) {
      const id = `${prefix}_${i}`;
      const defaultValue =
        typeof config.default === "function"
          ? config.default()
          : config.default;
      result[id] = {
        ...config,
        default: defaultValue,
      };
    }

    return result;
  },

  /**
   * Create a single variable directly.
   */
  create(id: string, config: number | IVariableUserInput): IVariablesUserInput {
    return { [id]: config };
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Merge multiple variable objects into one.
 * Later objects override earlier ones for duplicate keys.
 */
export function mergeVariables(
  ...sources: IVariablesUserInput[]
): IVariablesUserInput {
  return Object.assign({}, ...sources);
}

/**
 * Merge multiple formula arrays into one.
 */
export function mergeFormulas(...sources: IFormula[][]): IFormula[] {
  return sources.flat();
}
