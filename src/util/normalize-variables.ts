/**
 * Normalizes simplified variable configurations into full IVariable objects.
 *
 * Supports the following input formats:
 * - Number: `a: 0.1` → constant with that value
 * - Minimal object: `W: { role: "input" }` → input with default value 0
 * - Minimal computed: `T: { role: "computed" }` → computed variable
 * - Full IVariable: used as-is
 */
import {
  INPUT_VARIABLE_DEFAULT,
  IVariable,
  IVariableInput,
  IVariablesInput,
} from "../types/variable";

/**
 * Normalize a single variable input to a full IVariable object
 */
export function normalizeVariable(input: IVariableInput): IVariable {
  // Case 1: Input is just a number - becomes a constant
  if (typeof input === "number") {
    return {
      role: "constant",
      value: input,
    };
  }
  // Case 2: Input is an IVariable object - apply smart defaults
  const normalized: IVariable = { ...input };

  // Apply smart defaults based on role
  if (normalized.role === "input") {
    // Set default value if not provided
    if (normalized.value === undefined) {
      normalized.value = INPUT_VARIABLE_DEFAULT.VALUE;
    }
    // Set default interaction mode if not provided
    // - If range is specified, use drag interaction
    // - If no range, use inline typable input
    if (normalized.interaction === undefined) {
      normalized.interaction = normalized.range ? "drag" : "inline";
    }
  } else if (normalized.role === "constant") {
    // Set default value if not provided
    if (normalized.value === undefined) {
      normalized.value = INPUT_VARIABLE_DEFAULT.VALUE;
    }
  }
  // For computed variables, value will be calculated

  return normalized;
}

/**
 * Normalize all variables in a config object
 */
export function normalizeVariables(
  variables: IVariablesInput | Record<string, IVariable> | undefined
): Record<string, IVariable> {
  if (!variables) {
    return {};
  }
  const normalized: Record<string, IVariable> = {};
  for (const [varId, input] of Object.entries(variables)) {
    normalized[varId] = normalizeVariable(input as IVariableInput);
  }
  return normalized;
}
