import { IEnvironment } from "../types/environment";
import { computationStore } from "./computation";

/**
 * Sets a variable value in the given environment
 * @param environment The environment containing the variables
 * @param name The variable name to set
 * @param value The new value to set
 * @returns true if the variable was set successfully, false otherwise
 */
export function setVariable(
  environment: IEnvironment,
  name: string,
  value: number
): boolean {
  // Find the variable by name
  if (!environment.variables) {
    return false;
  }

  const variable = environment.variables[name];
  if (!variable) {
    return false;
  }

  // Only allow setting non-dependent variables
  if (variable.type !== "dependent") {
    computationStore.setValue(name, value);
    return true;
  }

  return false;
}
