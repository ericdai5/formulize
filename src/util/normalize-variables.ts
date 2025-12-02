/**
 * Normalizes simplified variable configurations into full IVariable objects.
 *
 * Supports the following input formats:
 * - Number: `a: 0.1` → constant with that value
 * - User-facing object with "default": `W: { role: "input", default: 5 }` → input with value 5
 * - Minimal object: `W: { role: "input" }` → input with default value 1
 * - Minimal computed: `T: { role: "computed" }` → computed variable
 * - Full IVariable (internal): used as-is
 *
 * Note: User-facing API uses "default" property, which is converted to internal "value" property
 */
import {
  INPUT_VARIABLE_DEFAULT,
  IVariable,
  IVariableUserInput,
  IVariablesUserInput,
} from "../types/variable";

/**
 * Normalize a single variable input to a full IVariable object.
 * Converts from user-facing format (with "default") to internal format (with "value").
 */
export function normalizeVariable(
  input: IVariableUserInput | number
): IVariable {
  // Case 1: Input is just a number - becomes a constant
  if (typeof input === "number") {
    return {
      role: "constant",
      value: input,
    };
  }

  // Case 2: Input is a user-facing IVariableUserInput - convert "default" to "value"
  // Strict check: reject if "value" property is used
  if ('value' in input) {
    throw new Error(
      'Variable configuration uses "value" property which is not allowed. ' +
      'Use "default" instead. For example: { role: "input", default: 5 }'
    );
  }

  const { default: defaultValue, ...rest } = input;
  const normalized: IVariable = {
    ...rest,
    value: defaultValue,
  };
  return applySmartDefaults(normalized);
}

/**
 * Apply smart defaults to a variable based on its role
 */
function applySmartDefaults(normalized: IVariable): IVariable {
  // Apply smart defaults based on role
  if (normalized.role === "input") {
    // Set default value if not provided (only for scalar inputs, not sets)
    if (normalized.value === undefined) {
      normalized.value = INPUT_VARIABLE_DEFAULT.VALUE;
    }
    // Set default interaction mode if not provided
    // - If range is specified, use drag interaction
    // - If no range and value is a scalar, use inline typable input
    // - If value is an array (set), don't set any interaction (use controls)
    if (
      normalized.interaction === undefined &&
      !Array.isArray(normalized.value)
    ) {
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
 * Normalize all variables in a config object.
 * Converts from user-facing environment format to internal IVariable format.
 */
export function normalizeVariables(
  variables: IVariablesUserInput | undefined
): Record<string, IVariable> {
  if (!variables) {
    return {};
  }
  const normalized: Record<string, IVariable> = {};
  for (const [varId, input] of Object.entries(variables)) {
    normalized[varId] = normalizeVariable(input);
  }
  return normalized;
}
