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
} from "../FormulaTree";
import { getVariable } from "../util/computation-helpers";
import { computationStore } from "./computation";

/**
 * Process an augmented formula tree to find Variable nodes and wrap their tokens
 * with CSS classes for interactive display
 */
export const processVariablesInFormula = (
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
      let value = 0;
      let isInputVariable = false;
      let hasDropdownOptions = false;
      let variablePrecision = defaultPrecision;
      let showName = true; // Default to showing name for backward compatibility

      for (const [symbol, variable] of computationStore.variables.entries()) {
        if (symbol === originalSymbol) {
          value = variable.value ?? 0;
          isInputVariable = variable.type === "input";
          // Check if variable has dropdown options (set or options property)
          hasDropdownOptions = !!(variable.set || variable.options);
          // Use the variable's precision if defined, otherwise use default
          variablePrecision = variable.precision ?? defaultPrecision;
          // Use the variable's showName property if defined, otherwise default to true
          showName = variable.showName ?? true;
          break;
        }
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

      // Wrap the token with CSS classes using the variable's specific precision
      // Conditionally show the variable name based on showName property
      const result = showName
        ? `\\cssId{${id}}{\\class{${cssClass}}{${token}: ${value.toFixed(variablePrecision)}}}`
        : `\\cssId{${id}}{\\class{${cssClass}}{${value.toFixed(variablePrecision)}}}`;
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
 * Traverse the formula tree and collect all Variable nodes
 */
export const collectVariableNodes = (formula: AugmentedFormula): Variable[] => {
  const variables: Variable[] = [];

  const traverse = (node: AugmentedFormulaNode) => {
    if (node.type === "variable") {
      variables.push(node as Variable);
    }

    // Recursively traverse children
    node.children.forEach(traverse);
  };

  formula.children.forEach(traverse);
  return variables;
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
    const variablePatterns = Array.from(computationStore.variables.keys());

    // Parse variable patterns into trees for grouping
    const variableTrees = parseVariableStrings(variablePatterns);

    // Create formula tree with variables grouped, passing original symbols
    const formula = deriveTreeWithVars(latex, variableTrees, variablePatterns);

    return processVariablesInFormula(formula, defaultPrecision);
  } catch (error) {
    console.warn("Failed to process latex content:", error);
    return latex; // Return original latex if processing fails
  }
};
