import { IComputation } from "../types/computation";

/**
 * Get formula expression by id from a provided configuration
 * @param id - The id of the formula to retrieve
 * @param config - Configuration object containing computation with expressions
 * @returns The formula expression string or null if not found
 */
export const getFormulaById = (
  id: string,
  config?: { computation?: IComputation }
): string | null => {
  try {
    if (!config || !config.computation || !config.computation.expressions) {
      console.warn("No computation expressions provided to getFormulaById");
      return null;
    }

    return config.computation.expressions[id] || null;
  } catch (error) {
    console.error("Error getting formula by ID:", error);
    return null;
  }
};
