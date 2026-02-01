/**
 * Normalizes simplified variable configurations into full IVariable objects.
 *
 * Supports the following input formats:
 * - Number: `a: 0.1` → constant with that value
 * - User-facing object with "default": `W: { input: "drag", default: 5 }` → draggable with value 5
 * - Minimal object: `W: { input: "drag" }` → draggable with default value 1
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
      value: input,
    };
  }

  // Case 2: Input is a user-facing IVariableUserInput - convert "default" to "value"
  // Strict check: reject if "value" property is used
  if ("value" in input) {
    throw new Error(
      'Variable configuration uses "value" property which is not allowed. ' +
        'Use "default" instead. For example: { input: "drag", default: 5 }'
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
 * Apply smart defaults to a variable based on its input type
 */
function applySmartDefaults(normalized: IVariable): IVariable {
  // Apply smart defaults based on input type
  if (normalized.input === "drag") {
    // Set default value if not provided (only for scalar inputs, not sets)
    if (normalized.value === undefined) {
      normalized.value = INPUT_VARIABLE_DEFAULT.VALUE;
    }
    // Set default range if not provided
    if (normalized.range === undefined) {
      normalized.range = [
        INPUT_VARIABLE_DEFAULT.MIN_VALUE,
        INPUT_VARIABLE_DEFAULT.MAX_VALUE,
      ];
    }
  } else if (normalized.input === "inline") {
    // Set default value if not provided for inline inputs
    if (normalized.value === undefined) {
      normalized.value = INPUT_VARIABLE_DEFAULT.VALUE;
    }
  }
  // For non-interactive variables (constants or computed by manual function),
  // value will either be set by default or calculated by the manual function

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
