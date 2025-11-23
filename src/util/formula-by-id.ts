import { IFormula } from "../types/formula";

/**
 * Get formula expression by id from a provided configuration
 * @param id - The id of the formula to retrieve
 * @param config - Configuration object containing formulas
 * @returns The formula expression string or null if not found
 */
export const getFormulaById = (
  id: string,
  config?: { formulas?: IFormula[] }
): string | null => {
  try {
    if (!config || !config.formulas) {
      console.warn("No configuration provided to getFormulaById");
      return null;
    }

    const formula = config.formulas.find((f) => f.id === id);
    return formula?.expression || null;
  } catch (error) {
    console.error("Error getting formula by ID:", error);
    return null;
  }
};
