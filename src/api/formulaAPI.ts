import { AugmentedFormula, deriveAugmentedFormula } from "../FormulaTree";
import { canonicalizeFormula } from "../formulaTransformations";
import { formulaStore } from "../store";
import { computationStore } from "./computation";

export type VariableType = "constant" | "input" | "dependent";

export interface FormulaVariable {
  type: VariableType;
  value?: number;
  range?: [number, number];
  units?: string;
  label?: string;
  round?: number;
}

export interface FormulaDefinition {
  formula: string;
  variables: Record<string, FormulaVariable>;
  name?: string;
  description?: string;
}

/**
 * Creates a formula and sets it in the formula store and computation store
 */
export const createFormula = async (
  formulaDef: FormulaDefinition
): Promise<boolean> => {
  try {
    // Parse the formula to get an augmented formula object
    const formula = deriveAugmentedFormula(formulaDef.formula);
    const canonicalFormula = canonicalizeFormula(formula);

    // Set the formula in the store
    formulaStore.updateFormula(canonicalFormula);

    // Add variables to computation store
    Object.entries(formulaDef.variables).forEach(([varName, varDef]) => {
      const symbol = varName.replace(/\$/g, "");
      const varId = `var-${symbol}`;

      // Add variable to computation store
      computationStore.addVariable(varId, symbol);

      // Map variable types to computation store types
      const type = mapVariableType(varDef.type);
      computationStore.setVariableType(varId, type);

      // Set initial value if provided
      if (varDef.value !== undefined) {
        computationStore.setValue(varId, varDef.value);
      }
    });

    // Set the formula for computation
    await computationStore.setFormula(formulaStore.latexWithoutStyling);

    return true;
  } catch (error) {
    console.error("Error creating formula:", error);
    return false;
  }
};

/**
 * Maps API variable types to computation store types
 */
function mapVariableType(
  type: VariableType
): "constant" | "input" | "dependent" | "none" {
  switch (type) {
    case "constant":
      return "constant";
    case "input":
      return "input";
    case "dependent":
      return "dependent";
    default:
      return "none";
  }
}

/**
 * Resets the formula state
 */
export const resetFormulaState = () => {
  // Reset with an empty formula (best we can do without direct reset methods)
  formulaStore.updateFormula(new AugmentedFormula([]));
};
