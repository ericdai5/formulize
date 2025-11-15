import { computationStore } from "../store/computation";

/**
 * Get a variable value from the computation store
 * @param variableName - The name/symbol of the variable to retrieve
 * @returns The variable value or 0 if not found
 */
export const getVariableValue = (variableName: string): number => {
  try {
    const variable = computationStore.variables.get(variableName);
    const value = variable?.value;
    return typeof value === "number" ? value : 0;
  } catch (error) {
    console.warn(`Variable ${variableName} not found:`, error);
    return 0;
  }
};

/**
 * Get all variables from the computation store as a record
 * @returns Record of variable names to their values
 */
export const getAllVariables = (): Record<string, number> => {
  const variables: Record<string, number> = {};
  computationStore.variables.forEach((variable, name) => {
    const value = variable.value;
    if (value !== undefined && typeof value === "number") {
      variables[name] = value;
    }
  });
  return variables;
};

/**
 * Get a variable object from the computation store
 * @param variableName - The name/symbol of the variable to retrieve
 * @returns The variable object or undefined if not found
 */
export const getVariable = (variableName: string) => {
  return computationStore.variables.get(variableName);
};

/**
 * Update a variable value in the computation store
 * @param variableName - The name/symbol of the variable to update
 * @param value - The new value to set
 */
export const updateVariable = (variableName: string, value: number) => {
  try {
    if (computationStore.variables.has(variableName)) {
      computationStore.setValue(variableName, value);
    }
  } catch (error) {
    console.error(`Error updating variable ${variableName}:`, error);
  }
};
