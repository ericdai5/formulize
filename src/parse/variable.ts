import { computationStore } from "../store/computation";
import { getVariable } from "../util/computation-helpers";
import {
  Accent,
  Aligned,
  AugmentedFormula,
  AugmentedFormulaNode,
  Box,
  Brace,
  Color,
  Delimited,
  Fraction,
  Group,
  MathSymbol,
  Matrix,
  Op,
  Root,
  Script,
  Space,
  Strikethrough,
  Text,
  Variable,
  deriveTreeWithVars,
  parseVariableStrings,
} from "./formula-tree";

/**
 * Process index variable within a formula node subtree
 * Index variable should render as its value instead of variable name
 */
const processIndexVariable = (
  node: AugmentedFormulaNode,
  indexVariable: string,
  defaultPrecision: number
): string => {
  const processNode = (node: AugmentedFormulaNode): string => {
    // Check if this is a symbol that matches the index variable
    if (node.type === "symbol") {
      const symbol = node as MathSymbol;
      if (symbol.value === indexVariable) {
        // This is the index variable - render its value instead of the symbol
        let value: number | undefined = undefined;
        let variablePrecision = defaultPrecision;
        // Get the value from the computation store
        for (const [
          varSymbol,
          variable,
        ] of computationStore.variables.entries()) {
          if (varSymbol === symbol.value) {
            value = variable.value;
            variablePrecision = variable.precision ?? defaultPrecision;
            break;
          }
        }
        // Apply CSS class for index variables - only if value exists
        if (value !== null && value !== undefined && !isNaN(value)) {
          const result = `\\class{interactive-var-index}{${value.toFixed(variablePrecision)}}`;
          return result;
        } else {
          // Fallback to showing the symbol if no value
          return symbol.value;
        }
      }
      return symbol.value;
    }

    // For other node types, recursively process their children
    switch (node.type) {
      case "script": {
        const script = node as Script;
        const base = processNode(script.base);
        const sub = script.sub ? processNode(script.sub) : undefined;
        const sup = script.sup ? processNode(script.sup) : undefined;
        let result = base;
        if (sub) result += `_{${sub}}`;
        if (sup) result += `^{${sup}}`;
        return result;
      }

      case "group": {
        const group = node as Group;
        const children = group.body.map(processNode).join(" ");
        return `{${children}}`;
      }

      case "frac": {
        const frac = node as Fraction;
        const numerator = processNode(frac.numerator);
        const denominator = processNode(frac.denominator);
        return `\\frac{${numerator}}{${denominator}}`;
      }

      case "color": {
        const color = node as Color;
        const children = color.body.map(processNode).join(" ");
        return `\\textcolor{${color.color}}{${children}}`;
      }

      case "space": {
        const space = node as Space;
        return space.text;
      }

      case "op": {
        const op = node as Op;
        return op.limits ? `${op.operator}\\limits` : op.operator;
      }

      case "root": {
        const root = node as Root;
        const body = processNode(root.body);
        if (root.index) {
          const index = processNode(root.index);
          return `\\sqrt[${index}]{${body}}`;
        }
        return `\\sqrt{${body}}`;
      }

      case "delimited": {
        const delimited = node as Delimited;
        const children = delimited.body.map(processNode).join(" ");
        return `\\left${delimited.left}${children}\\right${delimited.right}`;
      }

      case "accent": {
        const accent = node as Accent;
        const base = processNode(accent.base);
        return `${accent.label}{${base}}`;
      }

      case "text": {
        const text = node as Text;
        const children = text.body.map(processNode).join("");
        return `\\text{${children}}`;
      }

      case "box": {
        const box = node as Box;
        const body = processNode(box.body);
        return `\\fcolorbox{${box.borderColor}}{${box.backgroundColor}}{$${body}$}`;
      }

      case "strikethrough": {
        const strike = node as Strikethrough;
        const body = processNode(strike.body);
        return `\\cancel{${body}}`;
      }

      case "brace": {
        const brace = node as Brace;
        const base = processNode(brace.base);
        const command = brace.over ? "\\overbrace" : "\\underbrace";
        return `${command}{${base}}`;
      }

      case "array": {
        const array = node as Aligned;
        const rows = array.body
          .map((row) => row.map((cell) => processNode(cell)).join(" & "))
          .join(" \\\\ ");

        const numCols = Math.max(...array.body.map((row) => row.length));
        const columnAlignment =
          numCols === 2 ? ["r", "l"] : Array(numCols).fill("l");

        return `\\begin{array}{${columnAlignment.join("")}}\n${rows}\n\\end{array}`;
      }

      case "matrix": {
        const matrix = node as Matrix;
        const rows = matrix.body
          .map((row) => row.map((cell) => processNode(cell)).join(" & "))
          .join(" \\\\ ");

        return `\\begin{${matrix.matrixType}}\n${rows}\n\\end{${matrix.matrixType}}`;
      }

      case "variable": {
        // For Variable nodes within index processing, just process their body
        const variable = node as Variable;
        return processNode(variable.body);
      }

      default:
        // For other node types, use their LaTeX representation
        return (node as any).toLatex
          ? (node as any).toLatex("no-id", 0)[0]
          : "";
    }
  };

  return processNode(node);
};

/**
 * Process an augmented formula tree to find Variable nodes and wrap their tokens
 * with CSS classes for interactive display
 */
export const processVariables = (
  formula: AugmentedFormula,
  defaultPrecision: number = 2
): string => {
  const processNode = (node: AugmentedFormulaNode): string => {
    if (node.type === "variable") {
      const variableNode = node as Variable;
      const originalSymbol = variableNode.originalSymbol;

      // Get the token from the variable's body (the LaTeX representation of what's inside)
      const token =
        variableNode.body && "toLatex" in variableNode.body
          ? variableNode.body.toLatex("no-id", 0)[0]
          : originalSymbol;

      // Get the value, type, and precision from the computation store
      let value: number | undefined = undefined;
      let isInputVariable = false;
      let hasDropdownOptions = false;
      let variablePrecision = defaultPrecision;
      let display: "name" | "value" | "both" = "both"; // Default to showing both for backward compatibility
      let indexVariable = "";

      for (const [symbol, variable] of computationStore.variables.entries()) {
        if (symbol === originalSymbol) {
          value = variable.value;
          isInputVariable = variable.type === "input";
          // Check if variable has dropdown options (set or options property)
          hasDropdownOptions = !!(variable.set || variable.options);
          // Use the variable's precision if defined, otherwise use default
          variablePrecision = variable.precision ?? defaultPrecision;
          // Use the variable's display property if defined, otherwise default to "name"
          display = variable.latexDisplay ?? "name";
          // Get the index variable from the computation store
          indexVariable = variable.index || "";
          break;
        }
      }

      // Process the variable's body to apply index variable styling
      let processedBody = token;
      if (indexVariable) {
        processedBody = processIndexVariable(
          variableNode.body,
          indexVariable,
          defaultPrecision
        );
      }

      // Use the original symbol as the CSS ID
      const id = originalSymbol;

      // Use different CSS classes based on variable type and interaction mode
      let cssClass = "interactive-var-dependent";
      if (isInputVariable) {
        cssClass = hasDropdownOptions
          ? "interactive-var-dropdown"
          : "interactive-var-slidable";
      }

      // Hover class is managed via MobX reactions to avoid full LaTeX re-renders

      // Wrap the processed body with CSS classes using the variable's specific precision
      // Show name, value, or both based on display property
      let result = "";
      switch (display) {
        case "name":
          result = `\\cssId{${id}}{\\class{${cssClass}}{${processedBody}}}`;
          break;
        case "value":
          // If no value is available, fallback to showing the name
          if (value !== null && value !== undefined && !isNaN(value)) {
            result = `\\cssId{${id}}{\\class{${cssClass}}{${value.toFixed(variablePrecision)}}}`;
          } else {
            result = `\\cssId{${id}}{\\class{${cssClass}}{${processedBody}}}`;
          }
          break;
        case "both":
          // If no value is available, fallback to showing just the name
          if (value !== null && value !== undefined && !isNaN(value)) {
            result = `\\cssId{${id}}{\\class{${cssClass}}{${processedBody}: ${value.toFixed(variablePrecision)}}}`;
          } else {
            result = `\\cssId{${id}}{\\class{${cssClass}}{${processedBody}}}`;
          }
          break;
        default:
          // If no value is available, fallback to showing just the name
          if (value !== null && value !== undefined && !isNaN(value)) {
            result = `\\cssId{${id}}{\\class{${cssClass}}{${processedBody}: ${value.toFixed(variablePrecision)}}}`;
          } else {
            result = `\\cssId{${id}}{\\class{${cssClass}}{${processedBody}}}`;
          }
          break;
      }
      return result;
    }

    // For other node types, recursively process their children
    switch (node.type) {
      case "script": {
        const script = node as Script;
        const base = processNode(script.base);
        const sub = script.sub ? processNode(script.sub) : undefined;
        const sup = script.sup ? processNode(script.sup) : undefined;

        let result = base;
        if (sub) result += `_{${sub}}`;
        if (sup) result += `^{${sup}}`;
        return result;
      }

      case "frac": {
        const frac = node as Fraction;
        const numerator = processNode(frac.numerator);
        const denominator = processNode(frac.denominator);
        return `\\frac{${numerator}}{${denominator}}`;
      }

      case "group": {
        const group = node as Group;
        const children = group.body.map(processNode).join(" ");
        return `{${children}}`;
      }

      case "color": {
        const color = node as Color;
        const children = color.body.map(processNode).join(" ");
        return `\\textcolor{${color.color}}{${children}}`;
      }

      case "box": {
        const box = node as Box;
        const body = processNode(box.body);
        return `\\fcolorbox{${box.borderColor}}{${box.backgroundColor}}{$${body}$}`;
      }

      case "brace": {
        const brace = node as Brace;
        const base = processNode(brace.base);
        const command = brace.over ? "\\overbrace" : "\\underbrace";
        return `${command}{${base}}`;
      }

      case "text": {
        const text = node as Text;
        const children = text.body
          .map((child) =>
            "toLatex" in child ? child.toLatex("no-id", 0)[0] : ""
          )
          .join("");
        return `\\text{${children}}`;
      }

      case "array": {
        const array = node as Aligned;
        const rows = array.body
          .map((row) => row.map((cell) => processNode(cell)).join(" & "))
          .join(" \\\\ ");

        const numCols = Math.max(...array.body.map((row) => row.length));
        const columnAlignment =
          numCols === 2 ? ["r", "l"] : Array(numCols).fill("l");

        return `\\begin{array}{${columnAlignment.join("")}}\n${rows}\n\\end{array}`;
      }

      case "matrix": {
        const matrix = node as Matrix;
        const rows = matrix.body
          .map((row: AugmentedFormulaNode[]) =>
            row.map((cell) => processNode(cell)).join(" & ")
          )
          .join(" \\\\ ");

        return `\\begin{${matrix.matrixType}}\n${rows}\n\\end{${matrix.matrixType}}`;
      }

      case "delimited": {
        const delimited = node as Delimited;
        const children = delimited.body.map(processNode).join(" ");
        return `\\left${delimited.left}${children}\\right${delimited.right}`;
      }

      case "root": {
        const root = node as Root;
        const body = processNode(root.body);
        if (root.index) {
          const index = processNode(root.index);
          return `\\sqrt[${index}]{${body}}`;
        }
        return `\\sqrt{${body}}`;
      }

      case "strikethrough": {
        const strike = node as Strikethrough;
        const body = processNode(strike.body);
        return `\\cancel{${body}}`;
      }

      case "symbol": {
        const symbol = node as MathSymbol;
        return symbol.value;
      }

      case "space": {
        const space = node as Space;
        return space.text;
      }

      case "op": {
        const op = node as Op;
        return op.limits ? `${op.operator}\\limits` : op.operator;
      }

      case "accent": {
        const accent = node as Accent;
        const base = processNode(accent.base);
        return `${accent.label}{${base}}`;
      }

      default:
        // Fallback to the node's own LaTeX representation
        return (node as AugmentedFormulaNode).toLatex
          ? (node as AugmentedFormulaNode).toLatex("no-id", 0)[0]
          : "";
    }
  };

  return formula.children.map(processNode).join(" ");
};

/**
 * Get variable state for input processing (used by drag handler)
 */
export const getInputVariableState = (
  varId: string
): { stepSize: number; minValue: number; maxValue: number } | null => {
  const variable = getVariable(varId);
  if (!variable) {
    return null;
  }
  // Get range from variable definition or use defaults
  const range = variable.range || [-10, 10];
  const [minValue, maxValue] = range;
  // Use the variable's step property if defined, otherwise calculate from range
  const stepSize = variable.step || (maxValue - minValue) / 100; // 100 steps across the range
  return {
    stepSize,
    minValue,
    maxValue,
  };
};

/**
 * Find a variable by matching the element's CSS ID to variables in the computation store
 */
export const findVariableByElement = (
  element: HTMLElement
): { varId: string; symbol: string } | null => {
  const cssId = element.id;
  if (!cssId) {
    return null;
  }
  // The CSS ID should be the original variable symbol
  // Find the corresponding variable in the computation store
  for (const [varId] of computationStore.variables.entries()) {
    if (varId === cssId) {
      return { varId, symbol: varId };
    }
  }
  return null;
};

/**
 * Process a latex string to find and wrap variables with CSS classes
 * This is the main function used by the Formula component
 */
export const processLatexContent = (
  latex: string,
  defaultPrecision: number = 2
): string => {
  try {
    // Get variable patterns from computation store
    const variable = Array.from(computationStore.variables.keys());
    // Parse variable patterns into trees for grouping
    const variableTrees = parseVariableStrings(variable);
    // Create formula tree with variables grouped, passing original symbols
    const formula = deriveTreeWithVars(latex, variableTrees, variable);
    return processVariables(formula, defaultPrecision);
  } catch (error) {
    console.warn("Failed to process latex content:", error);
    return latex; // Return original latex if processing fails
  }
};
