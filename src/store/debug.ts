import { action, observable } from "mobx";

import { IVariableUserInput } from "../types/variable";

/**
 * Serialize a single variable value to JavaScript string.
 */
function serializeSingleVariableJS(value: number | IVariableUserInput): string {
  if (typeof value === "number") {
    return String(value);
  }
  // For objects, format inline
  const props: string[] = [];
  if (value.input) props.push(`input: "${value.input}"`);
  if (value.default !== undefined) props.push(`default: ${value.default}`);
  if (value.name) props.push(`name: "${value.name}"`);
  if (value.range) props.push(`range: [${value.range[0]}, ${value.range[1]}]`);
  if (value.precision !== undefined)
    props.push(`precision: ${value.precision}`);
  if (value.step !== undefined) props.push(`step: ${value.step}`);
  return `{ ${props.join(", ")} }`;
}

/**
 * Update a single variable in the code string.
 */
function updateSingleVariableInCode(
  code: string,
  varId: string,
  value: number | IVariableUserInput
): string {
  const escapedVarId = varId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const varRegex = new RegExp(
    `(${escapedVarId}:\\s*)(-?\\d+(?:\\.\\d+)?|\\{[^{}]*\\})`
  );
  const newValue = serializeSingleVariableJS(value);
  return code.replace(varRegex, `$1${newValue}`);
}

/**
 * Delete a variable from the code string.
 */
function deleteVariableFromCode(code: string, varId: string): string {
  const escapedVarId = varId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const varRegex = new RegExp(
    `\\s*${escapedVarId}:\\s*(-?\\d+(?:\\.\\d+)?|\\{[^{}]*\\}),?\\s*`,
    "g"
  );
  return code.replace(varRegex, "");
}

/**
 * Debug settings store - persists independently of config changes.
 * Includes code editor state and debug visualization settings.
 */
class DebugStore {
  // ==================== Code Editor State ====================
  @observable
  accessor code: string = "";

  @observable
  accessor selectedTemplate: string = "";

  private codeByTemplate: Record<string, string> = {};

  @action
  setCode(newCode: string) {
    this.code = newCode;
    if (this.selectedTemplate) {
      this.codeByTemplate[this.selectedTemplate] = newCode;
    }
  }

  @action
  setSelectedTemplate(template: string, defaultCode: string) {
    this.selectedTemplate = template;
    const savedCode = this.codeByTemplate[template];
    this.code = savedCode || defaultCode;
  }

  @action
  updateVariable(varId: string, value: number | IVariableUserInput) {
    const updatedCode = updateSingleVariableInCode(this.code, varId, value);
    if (updatedCode !== this.code) {
      this.setCode(updatedCode);
    }
  }

  @action
  deleteVariable(varId: string) {
    const updatedCode = deleteVariableFromCode(this.code, varId);
    if (updatedCode !== this.code) {
      this.setCode(updatedCode);
    }
  }

  // ==================== Debug Visualization Settings ====================
  @observable
  accessor showFormulaBorders: boolean = false;

  @observable
  accessor showLabelBorders: boolean = false;

  @observable
  accessor showVariableBorders: boolean = false;

  @observable
  accessor showExpressionBorders: boolean = false;

  @observable
  accessor showFormulaShadow: boolean = false;

  @observable
  accessor showLabelShadow: boolean = false;

  @observable
  accessor showVariableShadow: boolean = false;

  @observable
  accessor showExpressionShadow: boolean = false;

  @observable
  accessor showStepBorders: boolean = false;

  @observable
  accessor showStepShadow: boolean = false;
}

// Singleton instance that persists across config changes
export const debugStore = new DebugStore();

export { DebugStore };
