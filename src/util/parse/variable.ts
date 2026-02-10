import { VAR_CLASSES } from "../../internal/css-classes";
import { ComputationStore } from "../../store/computation";
import { INPUT_VARIABLE_DEFAULT } from "../../types/variable";
import { injectDefaultCSS, injectHoverCSS } from "./custom-css";
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
 * Configuration for processing nested variables within a formula node subtree
 */
interface NestedVariableConfig {
  /** Default precision for number formatting */
  defaultPrecision: number;
  /** Computation store (required) */
  computationStore: ComputationStore;
  /** Active variables map (required) */
  activeVariables: Map<string, Set<string>>;
}

/**
 * Process nested variables within a formula node subtree.
 * Finds any symbols that are known variables and renders them with values when active.
 *
 * Examples:
 * - For y^{(i)} where 'i' is a variable: wraps 'i' with value display when active
 */
const processNestedVariable = (
  node: AugmentedFormulaNode,
  config: NestedVariableConfig
): string => {
  const { defaultPrecision, computationStore, activeVariables } = config;

  const processNode = (node: AugmentedFormulaNode): string => {
    // Handle symbol nodes
    if (node.type === "symbol") {
      const symbol = node as MathSymbol;
      // Check if this symbol is a known variable in the computation store
      if (computationStore.variables.has(symbol.value)) {
        return renderNestedVariable(
          symbol.value,
          defaultPrecision,
          computationStore,
          activeVariables
        );
      }
      return symbol.value;
    }

    // Handle accent nodes (e.g., \hat{y})
    if (node.type === "accent") {
      const accent = node as Accent;
      // Check if the entire accent node is a known variable
      const accentLatex =
        "toLatex" in accent ? accent.toLatex("no-id", 0)[0] : "";
      if (computationStore.variables.has(accentLatex)) {
        return renderNestedVariable(
          accentLatex,
          defaultPrecision,
          computationStore,
          activeVariables
        );
      }
      // Otherwise, process the base recursively
      const base = processNode(accent.base);
      return `${accent.label}{${base}}`;
    }

    // Handle group nodes (e.g., {t+1} in subscripts)
    if (node.type === "group") {
      const group = node as Group;
      // Check if the entire group matches a known variable
      // toLatex returns "{content}" with braces, so we need to strip them
      let groupLatex = "toLatex" in group ? group.toLatex("no-id", 0)[0] : "";
      // Strip surrounding braces if present
      if (groupLatex.startsWith("{") && groupLatex.endsWith("}")) {
        groupLatex = groupLatex.slice(1, -1);
      }
      // Also try removing spaces for matching (e.g., "t + 1" -> "t+1")
      const groupLatexNoSpaces = groupLatex.replace(/\s+/g, "");
      if (computationStore.variables.has(groupLatex)) {
        return renderNestedVariable(
          groupLatex,
          defaultPrecision,
          computationStore,
          activeVariables
        );
      }
      if (computationStore.variables.has(groupLatexNoSpaces)) {
        return renderNestedVariable(
          groupLatexNoSpaces,
          defaultPrecision,
          computationStore,
          activeVariables
        );
      }
      // Otherwise, process children recursively
      const children = group.body.map(processNode).join(" ");
      return `{${children}}`;
    }

    // For other node types, recursively process their children
    return processNodeChildren(node, processNode);
  };

  return processNode(node);
};

/**
 * Render a nested variable with its current value or symbol
 */
const renderNestedVariable = (
  symbolValue: string,
  defaultPrecision: number,
  computationStore: ComputationStore,
  activeVariables: Map<string, Set<string>>
): string => {
  let value: number | undefined = undefined;
  let variablePrecision = defaultPrecision;
  let latexDisplay: "name" | "value" = "name";
  let isDraggable = false;
  // Get the value from the computation store
  const variable = computationStore.variables.get(symbolValue);
  if (variable) {
    value = typeof variable.value === "number" ? variable.value : undefined;
    variablePrecision = variable.precision ?? INPUT_VARIABLE_DEFAULT.PRECISION;
    latexDisplay = variable.latexDisplay ?? "name";
    isDraggable = variable.input === "drag" || variable.input === "inline";
  }
  // Determine CSS class based on input type
  const cssClass = isDraggable ? VAR_CLASSES.INPUT : VAR_CLASSES.BASE;
  // Show value when active, symbol when not active
  // activeVariables is a Map<formulaId, Set<varId>>
  // Check if variable is active in any formula's set
  let isActive = false;
  for (const varSet of activeVariables.values()) {
    if (varSet.has(symbolValue)) {
      isActive = true;
      break;
    }
  }
  const hasValidValue = value !== null && value !== undefined && !isNaN(value);
  // Respect latexDisplay setting - only show value if latexDisplay allows it AND variable is active
  if (isActive && hasValidValue && latexDisplay === "value") {
    return `\\cssId{${symbolValue}}{\\class{${cssClass}}{${value!.toFixed(variablePrecision)}}}`;
  }
  // Default: show symbol name (for latexDisplay="name" or when not active)
  return `\\cssId{${symbolValue}}{\\class{${cssClass}}{${symbolValue}}}`;
};

/**
 * Process children of a node recursively using the provided processor function
 * This is the shared switch statement for all node types
 */
const processNodeChildren = (
  node: AugmentedFormulaNode,
  processNode: (n: AugmentedFormulaNode) => string
): string => {
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
      // For Variable nodes within nested processing, just process their body
      const variable = node as Variable;
      return processNode(variable.body);
    }

    case "accent": {
      const accent = node as Accent;
      const base = processNode(accent.base);
      return `${accent.label}{${base}}`;
    }

    default: {
      // For other node types, use their LaTeX representation
      const unknownNode = node as AugmentedFormulaNode;
      return "toLatex" in unknownNode ? unknownNode.toLatex("no-id", 0)[0] : "";
    }
  }
};

/**
 * Collect all variable IDs contained within a node subtree
 */
export const collectVariableIds = (node: AugmentedFormulaNode): string[] => {
  const varIds: string[] = [];
  const collect = (n: AugmentedFormulaNode) => {
    if (n.type === "variable") {
      const varNode = n as Variable;
      varIds.push(varNode.originalSymbol);
    }
    n.children.forEach(collect);
  };
  collect(node);
  return varIds;
};

// Counter for generating unique cssIds for structural nodes
let cssIdCounter = 0;
const resetCssIdCounter = () => {
  cssIdCounter = 0;
};

/**
 * Generate a unique cssId for a node
 */
const generateCssId = (nodeType: string): string => {
  return `${nodeType}-${cssIdCounter++}`;
};

/**
 * Wrap a node's result with a cssId and store the cssId on the AST node.
 * @param node - The AST node to wrap
 * @param nodeType - Type of node (e.g., "frac", "sum", "delim")
 * @param result - The processed LaTeX result to wrap
 * @returns LaTeX string wrapped with cssId
 */
const wrapWithCssId = (
  node: AugmentedFormulaNode,
  nodeType: string,
  result: string
): string => {
  const cssId = generateCssId(nodeType);
  // Store the cssId on the AST node for DOM element lookup
  node.cssId = cssId;
  return `\\cssId{${cssId}}{${result}}`;
};

/**
 * Check if a Script node contains a large operator (sum, prod, int, etc.)
 */
const getLargeOperatorType = (
  script: Script
): "sum" | "prod" | "int" | null => {
  // Check if the base is an Op node with a large operator
  if (script.base.type === "op") {
    const op = script.base as Op;
    const operator = op.operator.toLowerCase();
    if (operator.includes("sum")) return "sum";
    if (operator.includes("prod")) return "prod";
    if (operator.includes("int") || operator.includes("oint")) return "int";
  }
  return null;
};

/**
 * Result of processing a formula's variables
 */
export interface ProcessVariablesResult {
  /** The processed LaTeX string with cssId wrappers */
  latex: string;
  /** The formula tree with cssId values assigned to nodes */
  tree: AugmentedFormula;
}

/**
 * Process an augmented formula tree to find Variable nodes and wrap their tokens
 * with CSS classes for interactive display.
 * Also auto-detects structural elements (summations, fractions, etc.) and wraps them
 * with data-expression attributes for accurate bounding box calculations.
 * Additionally wraps operators and numbers with cssId to enable DOM-based expression
 * bounding box calculation.
 * @param formula - The augmented formula to process
 * @param defaultPrecision - Default precision for numeric display
 * @param computationStore - The computation store to use (required)
 * @param activeVariables - The active variables map (required)
 * @returns Object containing processed LaTeX and tokens array
 */
export const processVariables = (
  formula: AugmentedFormula,
  defaultPrecision: number = INPUT_VARIABLE_DEFAULT.PRECISION,
  computationStore: ComputationStore,
  activeVariables: Map<string, Set<string>>
): ProcessVariablesResult => {
  // Reset cssId counter for this formula
  resetCssIdCounter();

  const processNode = (node: AugmentedFormulaNode): string => {
    if (node.type === "variable") {
      const variableNode = node as Variable;
      const originalSymbol = variableNode.originalSymbol;

      // Get the value, type, and precision from the computation store
      let value: number | undefined = undefined;
      let isDraggable = false;
      let variablePrecision = defaultPrecision;
      let display: "name" | "value" = "name"; // Default to showing name
      let defaultCSS = "";
      let hoverCSS = "";
      let hasSVG = false;
      let svgMode: "replace" | "append" | undefined = undefined;

      for (const [symbol, variable] of computationStore.variables.entries()) {
        if (symbol === originalSymbol) {
          value =
            typeof variable.value === "number" ? variable.value : undefined;
          isDraggable = variable.input === "drag";
          // Use the variable's precision if defined, otherwise use default
          variablePrecision =
            variable.precision ?? INPUT_VARIABLE_DEFAULT.PRECISION;
          // Use the variable's display property if defined, otherwise default to "name"
          display = variable.latexDisplay ?? "name";
          // Get custom CSS if defined
          defaultCSS = variable.defaultCSS || "";
          hoverCSS = variable.hoverCSS || "";
          // Only treat variable as having in-formula SVG if svgMode is explicitly set
          hasSVG = !!(
            variable.svgMode &&
            (variable.svgPath || variable.svgContent)
          );
          svgMode = variable.svgMode;
          break;
        }
      }
      // Process the variable's body to find and render any nested variables
      const processedBody = processNestedVariable(variableNode.body, {
        defaultPrecision,
        computationStore,
        activeVariables,
      });
      // Use the original symbol as the CSS ID
      const id = originalSymbol;
      // Store the cssId on the AST node for DOM element lookup
      node.cssId = id;
      // Use different CSS classes based on input mode
      // Drag input variables get INPUT class (interactive), others get BASE class
      let cssClass: string = VAR_CLASSES.BASE;
      if (isDraggable) {
        cssClass = VAR_CLASSES.INPUT;
      }
      // Inject custom CSS and/or hover CSS into document head if defined
      if (defaultCSS) {
        injectDefaultCSS(id, defaultCSS, computationStore, value);
      }
      if (hoverCSS) {
        injectHoverCSS(id, hoverCSS, computationStore, value);
      }
      // Wrap the processed body with CSS classes using the variable's specific precision
      // Show name or value based on display property
      let result = "";
      // If variable has SVG in replace mode, create a placeholder that will be replaced
      if (hasSVG && svgMode === "replace") {
        // Use a phantom space that will be replaced with SVG
        result = `\\cssId{${id}}{\\class{${cssClass}}{\\phantom{M}}}`;
      } else {
        // Regular variable rendering (also used for append mode SVG)
        // The SVG will be appended after MathJax rendering if hasSVG && svgMode === "append"
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
          default:
            result = `\\cssId{${id}}{\\class{${cssClass}}{${processedBody}}}`;
            break;
        }
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

        // Check if this is a large operator (sum, prod, int) and wrap with data-expression
        const operatorType = getLargeOperatorType(script);
        if (operatorType) {
          return wrapWithCssId(script, operatorType, result);
        }

        // Also register Script nodes that have a Delimited base (e.g., (\left(...\right))^2)
        if (script.base.type === "delimited" && (script.sub || script.sup)) {
          return wrapWithCssId(script, "script-delim", result);
        }

        return result;
      }

      case "frac": {
        const frac = node as Fraction;
        const numerator = processNode(frac.numerator);
        const denominator = processNode(frac.denominator);
        const fracResult = `\\frac{${numerator}}{${denominator}}`;
        return wrapWithCssId(frac, "frac", fracResult);
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

        const matrixResult = `\\begin{${matrix.matrixType}}\n${rows}\n\\end{${matrix.matrixType}}`;
        return wrapWithCssId(matrix, "matrix", matrixResult);
      }

      case "delimited": {
        const delimited = node as Delimited;
        const children = delimited.body.map(processNode).join(" ");
        const delimResult = `\\left${delimited.left}${children}\\right${delimited.right}`;
        return wrapWithCssId(delimited, "delim", delimResult);
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
        const value = symbol.value;
        return wrapWithCssId(symbol, "symbol", value);
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
  const result = formula.children.map(processNode).join(" ");
  return { latex: result, tree: formula };
};

/**
 * Get variable state for input processing (used by drag handler)
 * @param varId - The variable ID
 * @param store - The computation store to use (required)
 */
export const getInputVariableState = (
  varId: string,
  store: ComputationStore
): { stepSize: number; minValue: number; maxValue: number } | null => {
  const variable = store.variables.get(varId);
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
 * @param element - The HTML element to check
 * @param computationStore - Optional computation store to search in
 */
export const findVariableByElement = (
  element: HTMLElement,
  computationStore?: ComputationStore
): { varId: string; symbol: string } | null => {
  const cssId = element.id;
  if (!cssId) {
    return null;
  }
  // If no store provided, just return the cssId as the varId
  // (used in step-handler where we just need to match element IDs)
  if (!computationStore) {
    return { varId: cssId, symbol: cssId };
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
 * @param latex - The LaTeX string to process
 * @param defaultPrecision - Default precision for numeric display
 * @param computationStore - The computation store to use (required)
 * @param formulaId - Optional formula ID for storing tokens
 */
export const processLatexContent = (
  latex: string,
  defaultPrecision: number,
  computationStore: ComputationStore,
  formulaId?: string
): string => {
  try {
    // Get variable patterns from computation store
    const variables = Array.from(computationStore.variables.keys());
    // Get active variables for visual cues
    const activeVariables = computationStore.getActiveVariables();
    // Parse variable patterns into trees for grouping
    const variableTrees = parseVariableStrings(variables);
    // Create formula tree with variables grouped, passing original symbols
    const formula = deriveTreeWithVars(latex, variableTrees, variables);
    const result = processVariables(
      formula,
      defaultPrecision,
      computationStore,
      activeVariables
    );
    // Store the formula tree with cssId values for DOM element lookup
    if (formulaId) {
      computationStore.setFormulaTree(formulaId, result.tree);
    }
    // console.log(
    //   `[processLatexContent] Final LaTeX for "${formulaId || "unknown"}":`,
    //   result.latex
    // );
    return result.latex;
  } catch (error) {
    console.warn("Failed to process latex content:", error);
    return latex; // Return original latex if processing fails
  }
};

/*** CURRENTLY NOT USED BUT MAY BE USEFUL IN THE FUTURE ***
 * Parse a latex string to find all variable identifiers contained within it.
 * This is useful for identifying which variables are present in a user-provided
 * LaTeX substring (like in a view() call).
 * @param latex - The LaTeX string to parse
 * @param computationStore - The computation store to use (required)
 */
// export const getVariablesFromLatexString = (
//   latex: string,
//   computationStore: ComputationStore
// ): string[] => {
//   try {
//     // Get variable patterns from computation store
//     const variables = Array.from(computationStore.variables.keys());
//     // Parse variable patterns into trees for grouping
//     const variableTrees = parseVariableStrings(variables);
//     // Create formula tree with variables grouped, passing original symbols
//     const formula = deriveTreeWithVars(latex, variableTrees, variables);
//     // Collect all variable IDs
//     // collectVariableIds expects an AugmentedFormulaNode, but formula is an AugmentedFormula (which has children property)
//     // We can iterate over children and collect IDs from each
//     const varIds: string[] = [];
//     formula.children.forEach((child) => {
//       varIds.push(...collectVariableIds(child));
//     });
//     return varIds;
//   } catch (error) {
//     console.warn("Failed to parse latex for variables:", error);
//     return [];
//   }
// };
