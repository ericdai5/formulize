import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";

interface CompletionOption {
  label: string;
  type?: string;
  info?: string;
  detail?: string;
  apply?: string;
}

// Variable type completions
const variableCompletions: CompletionOption[] = [
  { label: "type", type: "property", info: "Variable type" },
  { label: "value", type: "property", info: "Variable value (number)" },
  {
    label: "dataType",
    type: "property",
    info: "Data type: scalar | vector | matrix",
  },
  {
    label: "dimensions",
    type: "property",
    info: "Array of dimensions (number[])",
  },
  { label: "units", type: "property", info: "Units string" },
  { label: "name", type: "property", info: "Variable name" },
  { label: "precision", type: "property", info: "Precision (number)" },
  { label: "description", type: "property", info: "Variable description" },
  { label: "range", type: "property", info: "Range tuple [number, number]" },
  { label: "step", type: "property", info: "Step size (number)" },
  { label: "options", type: "property", info: "Options array (string[])" },
  { label: "set", type: "property", info: "Set of values (string | number)[]" },
  { label: "key", type: "property", info: "Variable key" },
  { label: "memberOf", type: "property", info: "Member of group" },
  {
    label: "latexDisplay",
    type: "property",
    info: "LaTeX display: name | value",
  },
  {
    label: "labelDisplay",
    type: "property",
    info: "Label display: name | value | none",
  },
  { label: "index", type: "property", info: "Variable index" },
];

// Variable type values
const variableRoleValues: CompletionOption[] = [
  { label: '"constant"', type: "value", info: "Constant variable type" },
  { label: '"input"', type: "value", info: "Input variable type" },
  { label: '"computed"', type: "value", info: "Computed variable type" },
];

// Data type values
const dataTypeValues: CompletionOption[] = [
  { label: '"scalar"', type: "value", info: "Scalar data type" },
  { label: '"vector"', type: "value", info: "Vector data type" },
  { label: '"matrix"', type: "value", info: "Matrix data type" },
];

// Display values
const displayValues: CompletionOption[] = [
  { label: '"name"', type: "value", info: "Display name" },
  { label: '"value"', type: "value", info: "Display value" },
  { label: '"none"', type: "value", info: "No display" },
];

// Formula completions
const formulaCompletions: CompletionOption[] = [
  { label: "name", type: "property", info: "Formula name" },
  { label: "function", type: "property", info: "Formula function string" },
  {
    label: "expression",
    type: "property",
    info: "Computational expression (optional)",
  },
  {
    label: "manual",
    type: "property",
    info: "Manual computation function (optional)",
  },
  {
    label: "variableLinkage",
    type: "property",
    info: "Variable linkage mapping (optional)",
  },
];

// Environment completions
const environmentCompletions: CompletionOption[] = [
  {
    label: "formulas",
    type: "property",
    info: "Array of formulas (IFormula[])",
  },
  {
    label: "variables",
    type: "property",
    info: "Variables record (Record<string, IVariable>)",
  },
  {
    label: "computation",
    type: "property",
    info: "Computation configuration (IComputation)",
  },
  {
    label: "visualizations",
    type: "property",
    info: "Visualizations array (IVisualization[], optional)",
  },
  {
    label: "controls",
    type: "property",
    info: "Controls array (IControls[], optional)",
  },
  {
    label: "fontSize",
    type: "property",
    info: "Font size multiplier (0.5 to 1.0, optional)",
  },
];

// Computation completions
const computationCompletions: CompletionOption[] = [
  { label: "engine", type: "property", info: "Computation engine type" },
  { label: "mappings", type: "property", info: "Function mappings (optional)" },
  { label: "apiKey", type: "property", info: "API key (optional)" },
  { label: "model", type: "property", info: "Model name (optional)" },
  { label: "mode", type: "property", info: "Execution mode (optional)" },
];

// Engine values
const engineValues: CompletionOption[] = [
  {
    label: '"symbolic-algebra"',
    type: "value",
    info: "Symbolic algebra engine",
  },
  { label: '"llm"', type: "value", info: "LLM computation engine" },
  { label: '"manual"', type: "value", info: "Manual computation engine" },
];

// Mode values
const modeValues: CompletionOption[] = [
  { label: '"step"', type: "value", info: "Step mode" },
  { label: '"normal"', type: "value", info: "Normal mode" },
];

// JavaScript keywords and common patterns
const jsCompletions: CompletionOption[] = [
  { label: "const", type: "keyword", info: "Constant declaration" },
  { label: "let", type: "keyword", info: "Variable declaration" },
  { label: "var", type: "keyword", info: "Variable declaration" },
  { label: "function", type: "keyword", info: "Function declaration" },
  { label: "return", type: "keyword", info: "Return statement" },
  { label: "if", type: "keyword", info: "Conditional statement" },
  { label: "else", type: "keyword", info: "Else clause" },
  { label: "for", type: "keyword", info: "For loop" },
  { label: "while", type: "keyword", info: "While loop" },
  { label: "true", type: "value", info: "Boolean true" },
  { label: "false", type: "value", info: "Boolean false" },
  { label: "null", type: "value", info: "Null value" },
  { label: "undefined", type: "value", info: "Undefined value" },
];

/**
 * Determines the context type based on the current cursor position
 */
function getCompletionContext(context: CompletionContext): string {
  const doc = context.state.doc;
  const pos = context.pos;

  // Get text before cursor
  const lineStart = doc.lineAt(pos).from;
  const textBefore = context.state.sliceDoc(lineStart, pos);

  // Check for property access context
  if (textBefore.includes("type:") || textBefore.includes("type :")) {
    return "variableRole";
  }

  if (textBefore.includes("dataType:") || textBefore.includes("dataType :")) {
    return "dataType";
  }

  if (
    textBefore.includes("latexDisplay:") ||
    textBefore.includes("latexDisplay :")
  ) {
    return "display";
  }

  if (
    textBefore.includes("labelDisplay:") ||
    textBefore.includes("labelDisplay :")
  ) {
    return "display";
  }

  if (textBefore.includes("engine:") || textBefore.includes("engine :")) {
    return "engine";
  }

  if (textBefore.includes("mode:") || textBefore.includes("mode :")) {
    return "mode";
  }

  // Check if we're in an object context
  const openBraces = (textBefore.match(/{/g) || []).length;
  const closeBraces = (textBefore.match(/}/g) || []).length;

  if (openBraces > closeBraces) {
    // Check what type of object we might be in
    const beforeBrace = context.state.sliceDoc(Math.max(0, pos - 200), pos);

    if (
      beforeBrace.includes("IVariable") ||
      beforeBrace.includes("variable") ||
      beforeBrace.includes("variables")
    ) {
      return "variable";
    }
    if (
      beforeBrace.includes("IFormula") ||
      beforeBrace.includes("formula") ||
      beforeBrace.includes("formulas")
    ) {
      return "formula";
    }
    if (
      beforeBrace.includes("IEnvironment") ||
      beforeBrace.includes("environment")
    ) {
      return "environment";
    }
    if (
      beforeBrace.includes("IComputation") ||
      beforeBrace.includes("computation")
    ) {
      return "computation";
    }

    return "object";
  }

  return "general";
}

/**
 * Main completion source for editor types
 */
export function editorCompletions(
  context: CompletionContext
): CompletionResult | null {
  const word = context.matchBefore(/"?[\w-]*/);

  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }

  const completionContext = getCompletionContext(context);
  let options: CompletionOption[] = [];

  switch (completionContext) {
    case "variableRole":
      options = variableRoleValues;
      break;
    case "dataType":
      options = dataTypeValues;
      break;
    case "display":
      options = displayValues;
      break;
    case "engine":
      options = engineValues;
      break;
    case "mode":
      options = modeValues;
      break;
    case "variable":
      options = [...variableCompletions, ...jsCompletions];
      break;
    case "formula":
      options = [...formulaCompletions, ...jsCompletions];
      break;
    case "environment":
      options = [...environmentCompletions, ...jsCompletions];
      break;
    case "computation":
      options = [...computationCompletions, ...jsCompletions];
      break;
    case "object":
      options = [
        ...variableCompletions,
        ...formulaCompletions,
        ...environmentCompletions,
        ...computationCompletions,
        ...jsCompletions,
      ];
      break;
    case "general":
    default:
      options = [
        ...jsCompletions,
        ...variableCompletions,
        ...formulaCompletions,
        ...environmentCompletions,
        ...computationCompletions,
      ];
      break;
  }

  return {
    from: word.from,
    options,
    validFor: /^"?[\w-]*$/,
  };
}

/**
 * Additional completion source for common JavaScript patterns in formula editor
 */
export function jsPatternCompletions(
  context: CompletionContext
): CompletionResult | null {
  const word = context.matchBefore(/"?[\w-]*/);

  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }

  const commonPatterns: CompletionOption[] = [
    {
      label: "IVariable",
      type: "interface",
      info: "Variable interface",
      apply: '{\n  type: "",\n  value: 0\n}',
    },
    {
      label: "IFormula",
      type: "interface",
      info: "Formula interface",
      apply: '{\n  id: "",\n  latex: ""\n}',
    },
    {
      label: "IEnvironment",
      type: "interface",
      info: "Environment interface",
      apply: "{\n  formulas: [],\n  variables: {},\n  computation: {}\n}",
    },
    {
      label: "IComputation",
      type: "interface",
      info: "Computation interface",
      apply: '{\n  engine: ""\n}',
    },
  ];

  return {
    from: word.from,
    options: commonPatterns,
    validFor: /^"?I[\w-]*$/,
  };
}
