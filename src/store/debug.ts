import { action, observable, runInAction } from "mobx";

import * as prettierBabel from "prettier/plugins/babel";
import * as prettierEstree from "prettier/plugins/estree";
import * as prettier from "prettier/standalone";

import { IVariableUserInput } from "../types/variable";

/**
 * Format code using Prettier.
 */
async function formatCode(code: string): Promise<string> {
  try {
    return await prettier.format(code, {
      parser: "babel",
      plugins: [prettierBabel, prettierEstree],
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: false,
      trailingComma: "all",
    });
  } catch {
    // If formatting fails, return original code
    return code;
  }
}

/**
 * Serialize a single variable value to JavaScript string.
 */
function serializeSingleVariableJS(value: number | IVariableUserInput): string {
  if (typeof value === "number") {
    return String(value);
  }
  // For objects, format as multi-line
  const props: string[] = [];
  if (value.input) props.push(`input: "${value.input}"`);
  if (value.default !== undefined) props.push(`default: ${value.default}`);
  if (value.name) props.push(`name: "${value.name}"`);
  if (value.range) props.push(`range: [${value.range[0]}, ${value.range[1]}]`);
  if (value.precision !== undefined)
    props.push(`precision: ${value.precision}`);
  if (value.sigFigs !== undefined) props.push(`sigFigs: ${value.sigFigs}`);
  if (value.step !== undefined) props.push(`step: ${value.step}`);
  if (value.filter !== undefined)
    props.push(`filter: ${JSON.stringify(value.filter)}`);
  if (value.exclude !== undefined)
    props.push(`exclude: ${JSON.stringify(value.exclude)}`);
  // Multi-line format with proper indentation
  return `{\n        ${props.join(",\n        ")},\n      }`;
}

/**
 * Update a single variable in the code string.
 */
function updateSingleVariableInCode(
  code: string,
  varId: string,
  value: number | IVariableUserInput
): string {
  const range = findVariableCodeRange(code, varId);
  if (!range) {
    return code;
  }
  const newValue = serializeSingleVariableJS(value);
  return (
    code.slice(0, range.valueStart) + newValue + code.slice(range.valueEnd)
  );
}

/**
 * Delete a variable from the code string.
 */
function deleteVariableFromCode(code: string, varId: string): string {
  const range = findVariableCodeRange(code, varId);
  if (!range) {
    return code;
  }

  let entryStart = range.entryStart;
  let entryEnd = range.valueEnd;

  // Include indentation when the variable occupies its own line.
  const lineStart = code.lastIndexOf("\n", entryStart - 1) + 1;
  if (/^\s*$/.test(code.slice(lineStart, entryStart))) {
    entryStart = lineStart;
  }

  // Prefer consuming the following comma and line break. If this is the final
  // entry, leaving the previous entry's comma produces a valid trailing comma.
  while (code[entryEnd] === " " || code[entryEnd] === "\t") {
    entryEnd++;
  }
  if (code[entryEnd] === ",") {
    entryEnd++;
  }
  while (code[entryEnd] === " " || code[entryEnd] === "\t") {
    entryEnd++;
  }
  if (code[entryEnd] === "\r" && code[entryEnd + 1] === "\n") {
    entryEnd += 2;
  } else if (code[entryEnd] === "\n") {
    entryEnd++;
  }

  return code.slice(0, entryStart) + code.slice(entryEnd);
}

/**
 * Find the content of a balanced braces block starting at the given position.
 * Returns the start and end indices of the content (excluding the outer braces).
 */
function findBalancedBraces(
  code: string,
  startIndex: number
): { contentStart: number; contentEnd: number } | null {
  let braceCount = 0;
  let contentStart = -1;

  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === "{") {
      if (braceCount === 0) {
        contentStart = i + 1;
      }
      braceCount++;
    } else if (code[i] === "}") {
      braceCount--;
      if (braceCount === 0) {
        return { contentStart, contentEnd: i };
      }
    }
  }
  return null;
}

interface VariableCodeRange {
  entryStart: number;
  valueStart: number;
  valueEnd: number;
}

/**
 * Find a variable entry and its value inside the top-level `variables` block.
 * Object values use balanced braces so occurrence rules can contain nested
 * `{ formula, instance }` objects without breaking editor updates.
 */
function findVariableCodeRange(
  code: string,
  varId: string
): VariableCodeRange | null {
  const variablesMatch = code.match(/variables:\s*\{/);
  if (!variablesMatch || variablesMatch.index === undefined) {
    return null;
  }

  const variablesBraces = findBalancedBraces(code, variablesMatch.index);
  if (!variablesBraces) {
    return null;
  }

  const variablesBlock = code.slice(
    variablesBraces.contentStart,
    variablesBraces.contentEnd
  );
  const blockOffset = variablesBraces.contentStart;
  const escapedVarId = varId
    .replace(/\\/g, "\\\\\\\\")
    .replace(/[.*+?^${}()|[\]]/g, "\\$&");
  const startRegex = new RegExp(
    `(?<![a-zA-Z0-9_])(["']?)${escapedVarId}\\1:\\s*`,
    "g"
  );

  let match: RegExpExecArray | null;
  while ((match = startRegex.exec(variablesBlock)) !== null) {
    const entryStart = blockOffset + match.index;
    const valueStart = entryStart + match[0].length;
    const afterColon = code.slice(valueStart);
    const numberMatch = afterColon.match(/^-?\d+(?:\.\d+)?/);

    if (numberMatch) {
      return {
        entryStart,
        valueStart,
        valueEnd: valueStart + numberMatch[0].length,
      };
    }

    if (afterColon.startsWith("{")) {
      const braces = findBalancedBraces(code, valueStart);
      if (braces) {
        return {
          entryStart,
          valueStart,
          valueEnd: braces.contentEnd + 1,
        };
      }
    }
  }

  return null;
}

/**
 * Add a new variable to the code string.
 */
function addVariableToCode(
  code: string,
  varId: string,
  value: number | IVariableUserInput
): string {
  // Find the start of the variables object
  const variablesStart = code.match(/variables:\s*\{/);
  if (!variablesStart || variablesStart.index === undefined) {
    return code;
  }

  const braces = findBalancedBraces(code, variablesStart.index);
  if (!braces) {
    return code;
  }

  const variablesContent = code.slice(braces.contentStart, braces.contentEnd);
  const newValue = serializeSingleVariableJS(value);

  // Check if variables object is empty or has existing entries
  const trimmedContent = variablesContent.trim();
  let newVariablesContent: string;

  if (trimmedContent === "") {
    // Empty object - add without leading comma
    newVariablesContent = `\n      ${varId}: ${newValue},\n    `;
  } else {
    // Has existing entries - ensure trailing comma and add new entry
    const contentWithComma = trimmedContent.endsWith(",")
      ? trimmedContent
      : trimmedContent + ",";
    newVariablesContent = `\n      ${contentWithComma}\n      ${varId}: ${newValue},\n    `;
  }

  // Replace the content between the braces
  return (
    code.slice(0, braces.contentStart) +
    newVariablesContent +
    code.slice(braces.contentEnd)
  );
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

  @observable
  accessor autoFormat: boolean = false;

  private codeByTemplate: Record<string, string> = {};

  @action
  toggleAutoFormat() {
    this.autoFormat = !this.autoFormat;
    if (this.autoFormat) {
      this.formatCurrentCode();
    }
  }

  @action
  setCode(newCode: string) {
    this.code = newCode;
    if (this.selectedTemplate) {
      this.codeByTemplate[this.selectedTemplate] = newCode;
    }
  }

  private formatAndSetCode(updatedCode: string) {
    this.setCode(updatedCode);
    if (!this.autoFormat) return;
    formatCode(updatedCode).then((formatted) => {
      runInAction(() => {
        if (this.code === updatedCode) {
          this.setCode(formatted);
        }
      });
    });
  }

  /**
   * Format the current code with Prettier.
   */
  formatCurrentCode() {
    if (!this.autoFormat) return;
    const currentCode = this.code;
    formatCode(currentCode).then((formatted) => {
      runInAction(() => {
        if (this.code === currentCode) {
          this.setCode(formatted);
        }
      });
    });
  }

  @action
  setSelectedTemplate(template: string, defaultCode: string) {
    this.selectedTemplate = template;
    const savedCode = this.codeByTemplate[template];
    const codeToUse = savedCode || defaultCode;
    this.code = codeToUse;
    // Format the initial code
    if (!this.autoFormat) return;
    formatCode(codeToUse).then((formatted) => {
      runInAction(() => {
        if (this.code === codeToUse) {
          this.setCode(formatted);
        }
      });
    });
  }

  @action
  updateVariable(varId: string, value: number | IVariableUserInput) {
    const updatedCode = updateSingleVariableInCode(this.code, varId, value);
    if (updatedCode !== this.code) {
      this.formatAndSetCode(updatedCode);
    }
  }

  @action
  deleteVariable(varId: string) {
    const updatedCode = deleteVariableFromCode(this.code, varId);
    if (updatedCode !== this.code) {
      this.formatAndSetCode(updatedCode);
    }
  }

  @action
  addVariable(varId: string, value: number | IVariableUserInput = 0) {
    const updatedCode = addVariableToCode(this.code, varId, value);
    if (updatedCode !== this.code) {
      this.formatAndSetCode(updatedCode);
    }
  }

  // ==================== Variable Hover Highlight ====================
  @observable
  accessor hoveredVariable: string | null = null;

  @action
  setHoveredVariable(varId: string | null) {
    this.hoveredVariable = varId;
  }

  /**
   * Find the character range of a variable definition in the code.
   * Returns { from, to } for CodeMirror highlighting, or null if not found.
   */
  findVariableRange(varId: string): { from: number; to: number } | null {
    const range = findVariableCodeRange(this.code, varId);
    return range ? { from: range.entryStart, to: range.valueEnd } : null;
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
