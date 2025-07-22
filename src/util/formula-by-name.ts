import { IFormula } from "../types/formula";

/**
 * Get formula expression by name from a provided configuration
 * @param formulaName - The name of the formula to retrieve
 * @param config - Configuration object containing formulas
 * @returns The formula expression string or null if not found
 */
export const getFormulaByName = (
  formulaName: string,
  config?: { formulas?: IFormula[] }
): string | null => {
  try {
    if (!config || !config.formulas) {
      console.warn("No configuration provided to getFormulaByName");
      return null;
    }

    const formula = config.formulas.find((f) => f.name === formulaName);
    return formula?.expression || null;
  } catch (error) {
    console.error("Error getting formula by name:", error);
    return null;
  }
};
