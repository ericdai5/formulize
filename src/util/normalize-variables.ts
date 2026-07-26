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
  IOccurence,
  IVariableUserInput,
  IVariablesUserInput,
  getStepFromRange,
} from "../types/variable";

type VariableOccurrenceRuleField = "filter" | "exclude";

/**
 * Validate and clone occurrence rules so user-owned config objects are never
 * mutated by later store operations.
 */
export function normalizeVariableOccurrenceRules(
  rules: IOccurence[] | undefined,
  field: VariableOccurrenceRuleField,
  formulaIds?: ReadonlySet<string>
): IOccurence[] | undefined {
  if (rules === undefined) {
    return undefined;
  }
  if (!Array.isArray(rules)) {
    throw new Error(`Variable "${field}" must be an array of rules.`);
  }

  return rules.map((rule, ruleIndex) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      throw new Error(
        `Variable "${field}" rule ${ruleIndex + 1} must be an object.`
      );
    }
    if (!Array.isArray(rule.formula) || rule.formula.length === 0) {
      throw new Error(
        `Variable "${field}" rule ${ruleIndex + 1} must include at least one formula ID.`
      );
    }
    if (!Array.isArray(rule.instance) || rule.instance.length === 0) {
      throw new Error(
        `Variable "${field}" rule ${ruleIndex + 1} must include at least one instance.`
      );
    }

    const formula = Array.from(new Set(rule.formula));
    for (const formulaId of formula) {
      if (typeof formulaId !== "string" || formulaId.length === 0) {
        throw new Error(
          `Variable "${field}" rule ${ruleIndex + 1} contains an invalid formula ID.`
        );
      }
      if (formulaIds && !formulaIds.has(formulaId)) {
        throw new Error(
          `Variable "${field}" rule ${ruleIndex + 1} references unknown formula "${formulaId}".`
        );
      }
    }

    const instance = Array.from(new Set(rule.instance)).sort((a, b) => a - b);
    for (const occurrence of instance) {
      if (!Number.isSafeInteger(occurrence) || occurrence < 1) {
        throw new Error(
          `Variable "${field}" rule ${ruleIndex + 1} instances must be positive, 1-indexed integers.`
        );
      }
    }

    return { formula, instance };
  });
}

/**
 * Normalize a single variable input to a full IVariable object.
 * Converts from user-facing format (with "default") to internal format (with "value").
 */
export function normalizeVariable(
  input: IVariableUserInput | number,
  formulaIds?: ReadonlySet<string>
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

  const { default: defaultValue, filter, exclude, ...rest } = input;
  const normalized: IVariable = {
    ...rest,
    value: defaultValue,
    filter: normalizeVariableOccurrenceRules(filter, "filter", formulaIds),
    exclude: normalizeVariableOccurrenceRules(exclude, "exclude", formulaIds),
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

  if (normalized.step === undefined && normalized.range !== undefined) {
    normalized.step = getStepFromRange(normalized.range);
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
  variables: IVariablesUserInput | undefined,
  formulaIds?: ReadonlySet<string>
): Record<string, IVariable> {
  if (!variables) {
    return {};
  }
  const normalized: Record<string, IVariable> = {};
  for (const [varId, input] of Object.entries(variables)) {
    try {
      normalized[varId] = normalizeVariable(input, formulaIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid variable "${varId}": ${message}`);
    }
  }
  return normalized;
}
