import { IFormula } from "../types/formula";

/**
 * Get formula expression by name from the global Formulize configuration
 * @param formulaName - The name of the formula to retrieve
 * @returns The formula expression string or null if not found
 */
export const getFormulaByName = (formulaName: string): string | null => {
  try {
    const currentConfig = (
      window as typeof window & {
        __lastFormulizeConfig?: { formulas?: IFormula[] };
      }
    ).__lastFormulizeConfig;
    if (!currentConfig || !currentConfig.formulas) {
      return null;
    }
    const formula = currentConfig.formulas.find((f) => f.name === formulaName);
    return formula?.expression || null;
  } catch (error) {
    console.error("Error getting formula by name:", error);
    return null;
  }
};
