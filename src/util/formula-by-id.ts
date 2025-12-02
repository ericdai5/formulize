import { ISemantics } from "../types/computation";

/**
 * Get formula expression by id from a provided configuration
 * @param id - The id of the formula to retrieve
 * @param config - Configuration object containing computation with expressions
 * @returns The formula expression string or null if not found
 */
export const getFormulaById = (
  id: string,
  config?: { semantics?: ISemantics }
): string | null => {
  try {
    if (!config || !config.semantics || !config.semantics.expressions) {
      console.warn("No computation expressions provided to getFormulaById");
      return null;
    }

    return config.semantics.expressions[id] || null;
  } catch (error) {
    console.error("Error getting formula by ID:", error);
    return null;
  }
};
