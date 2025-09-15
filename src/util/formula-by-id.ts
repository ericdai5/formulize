import { IFormula } from "../types/formula";

/**
 * Get formula expression by formulaId from a provided configuration
 * @param formulaId - The formulaId of the formula to retrieve
 * @param config - Configuration object containing formulas
 * @returns The formula expression string or null if not found
 */
export const getFormulaById = (
  formulaId: string,
  config?: { formulas?: IFormula[] }
): string | null => {
  try {
    if (!config || !config.formulas) {
      console.warn("No configuration provided to getFormulaById");
      return null;
    }

    const formula = config.formulas.find((f) => f.formulaId === formulaId);
    return formula?.expression || null;
  } catch (error) {
    console.error("Error getting formula by ID:", error);
    return null;
  }
};
