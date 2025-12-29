import { VAR_CLASSES } from "../rendering/css-classes";
import { computationStore } from "../store/computation";
import { executionStore } from "../store/execution";
import { IRole } from "../types/variable";
import { getVariable } from "../util/computation-helpers";
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
 * Get the CSS class for a variable based on its role
 * @param varSymbol - The variable symbol to look up
 * @returns The appropriate CSS class string
 */
const getCssClassForVariable = (varSymbol: string): string => {
  const variable = computationStore.variables.get(varSymbol);
  const role = variable?.role || "constant";
  if (role === "input") {
    return VAR_CLASSES.INPUT;
  } else if (role === "computed") {
    return VAR_CLASSES.COMPUTED;
  }
  return VAR_CLASSES.BASE;
};

/**
 * Configuration for processing nested variables within a formula node subtree
 */
interface NestedVariableConfig {
  /** Index variable to match and show its value (e.g., 'i' in y^{(i)}) */
  indexVariable?: string;
  /** Parent variable symbol to match and wrap with cssId (e.g., 'y' in y^{(i)}) */
  memberOfSymbol?: string;
  /** Default precision for number formatting */
  defaultPrecision: number;
  /** Custom CSS to inject for memberOf (overrides parent's CSS) */
  memberDefaultCSS?: string;
  /** Custom hover CSS to inject for memberOf */
  memberHoverCSS?: string;
  /** Value to use for CSS variable interpolation */
  memberValue?: number;
}

/**
 * Process nested variables within a formula node subtree.
 * Handles both index variables (showing values) and memberOf relationships (parent symbol wrapping).
 *
 * Examples:
 * - For y^{(i)} with index=i, memberOf=y: wraps 'i' with value display, wraps 'y' with cssId
 * - For \hat{y}^{(i)} with index=i, memberOf=\hat{y}: same behavior for accented parent
 * - For N_0 with memberOf=N: wraps 'N' with parent's styling/SVG
 */
const processNestedVariable = (
  node: AugmentedFormulaNode,
  config: NestedVariableConfig
): string => {
  const {
    indexVariable,
    memberOfSymbol,
    defaultPrecision,
    memberDefaultCSS,
    memberHoverCSS,
    memberValue,
  } = config;

  const processNode = (node: AugmentedFormulaNode): string => {
    // Handle symbol nodes
    if (node.type === "symbol") {
      const symbol = node as MathSymbol;

      // Check if this symbol matches the index variable
      if (indexVariable && symbol.value === indexVariable) {
        return renderIndexVariable(symbol.value, defaultPrecision);
      }

      // Check if this symbol matches the memberOf parent variable
      if (memberOfSymbol && symbol.value === memberOfSymbol) {
        return renderMemberOfSymbol(
          symbol.value,
          memberOfSymbol,
          memberDefaultCSS,
          memberHoverCSS,
          memberValue
        );
      }

      return symbol.value;
    }

    // Handle accent nodes (e.g., \hat{y})
    if (node.type === "accent") {
      const accent = node as Accent;
      // Check if entire accent matches memberOfSymbol
      if (memberOfSymbol) {
        const accentLatex =
          "toLatex" in accent ? accent.toLatex("no-id", 0)[0] : "";
        if (accentLatex === memberOfSymbol) {
          const cssClass = getCssClassForVariable(memberOfSymbol);
          const base = processNode(accent.base);
          return `\\cssId{${memberOfSymbol}}{\\class{${cssClass}}{${accent.label}{${base}}}}`;
        }
      }
      const base = processNode(accent.base);
      return `${accent.label}{${base}}`;
    }

    // For other node types, recursively process their children
    return processNodeChildren(node, processNode);
  };

  return processNode(node);
};

/**
 * Render an index variable with its current value or symbol
 */
const renderIndexVariable = (
  symbolValue: string,
  defaultPrecision: number
): string => {
  let value: number | undefined = undefined;
  let variablePrecision = defaultPrecision;
  let variableRole: IRole = "constant";

  // Get the value and role from the computation store
  const variable = computationStore.variables.get(symbolValue);
  if (variable) {
    value = typeof variable.value === "number" ? variable.value : undefined;
    variablePrecision = variable.precision ?? defaultPrecision;
    variableRole = variable.role || "constant";
  }

  // For index role variables, determine if we should show value or symbol
  let showValue = true;
  if (variableRole === "index") {
    let isActive = executionStore.activeVariables.has(symbolValue);

    // Also check if any variable that uses this as an index is active
    if (!isActive) {
      for (const activeVarId of executionStore.activeVariables) {
        const activeVar = computationStore.variables.get(activeVarId);
        if (activeVar?.index === symbolValue) {
          isActive = true;
          break;
        }
      }
    }

    // Only show value when active
    showValue = isActive;
  }

  // Always wrap with cssId for highlighting support
  // Show value when active, symbol when not active
  if (showValue && value !== null && value !== undefined && !isNaN(value)) {
    return `\\cssId{${symbolValue}}{\\class{${VAR_CLASSES.INDEX}}{${value.toFixed(variablePrecision)}}}`;
  } else {
    // Fallback to showing the symbol with cssId
    return `\\cssId{${symbolValue}}{\\class{${VAR_CLASSES.INDEX}}{${symbolValue}}}`;
  }
};

/**
 * Render a memberOf parent symbol with appropriate styling
 */
const renderMemberOfSymbol = (
  symbolValue: string,
  memberOfSymbol: string,
  memberDefaultCSS?: string,
  memberHoverCSS?: string,
  memberValue?: number
): string => {
  // Get parent variable's configuration
  const parentVar = computationStore.variables.get(memberOfSymbol);
  const parentValue =
    typeof parentVar?.value === "number" ? parentVar.value : undefined;
  const parentDefaultCSS = parentVar?.defaultCSS || "";
  const parentHoverCSS = parentVar?.hoverCSS || "";
  const parentHasSVG = !!(
    parentVar?.svgMode &&
    (parentVar.svgPath || parentVar.svgContent)
  );
  const parentSvgMode = parentVar?.svgMode;

  // Apply CSS - member CSS overrides parent CSS if provided
  const cssToApply = memberDefaultCSS || parentDefaultCSS;
  const hoverCssToApply = memberHoverCSS || parentHoverCSS;
  const valueToUse = memberValue !== undefined ? memberValue : parentValue;

  if (cssToApply) {
    injectDefaultCSS(memberOfSymbol, cssToApply, valueToUse);
  }
  if (hoverCssToApply) {
    injectHoverCSS(memberOfSymbol, hoverCssToApply, valueToUse);
  }

  const cssClass = getCssClassForVariable(memberOfSymbol);

  // If parent has SVG in replace mode, use phantom for the matching symbol
  if (parentHasSVG && parentSvgMode === "replace") {
    return `\\cssId{${memberOfSymbol}}{\\class{${cssClass}}{\\phantom{M}}}`;
  } else {
    return `\\cssId{${memberOfSymbol}}{\\class{${cssClass}}{${symbolValue}}}`;
  }
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
      // Accent handled separately in processNestedVariable for memberOf matching
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

/**
 * Get the original LaTeX representation of a node (without processing variables)
 * Used to create expression scope keys
 */
const getOriginalLatex = (node: AugmentedFormulaNode): string => {
  if ("toLatex" in node && typeof node.toLatex === "function") {
    return node.toLatex("no-id", 0)[0];
  }
  return "";
};

/**
 * Register an expression scope and wrap the result with a cssId
 * @param node - The AST node to register
 * @param expressionType - Type of expression (e.g., "frac", "sum", "delim")
 * @param result - The processed LaTeX result to wrap
 * @returns LaTeX string wrapped with cssId
 */
const wrapWithExpressionScope = (
  node: AugmentedFormulaNode,
  expressionType: string,
  result: string
): string => {
  const originalLatex = getOriginalLatex(node);
  const containedVars = collectVariableIds(node);
  const scopeId = computationStore.registerExpressionScope(
    originalLatex,
    expressionType,
    containedVars
  );
  return `\\cssId{${scopeId}}{${result}}`;
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
 * Process an augmented formula tree to find Variable nodes and wrap their tokens
 * with CSS classes for interactive display.
 * Also auto-detects structural elements (summations, fractions, etc.) and wraps them
 * with data-expression attributes for accurate bounding box calculations.
 */
export const processVariables = (
  formula: AugmentedFormula,
  defaultPrecision: number = 2
): string => {
  // Clear existing expression scopes before processing
  computationStore.clearExpressionScopes();

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
      let variableRole: IRole = "constant";
      let variablePrecision = defaultPrecision;
      let display: "name" | "value" | "both" = "both"; // Default to showing both for backward compatibility
      let indexVariable = "";
      let defaultCSS = "";
      let hoverCSS = "";
      let hasSVG = false;
      let svgMode: "replace" | "append" | undefined = undefined;
      let memberOf = "";

      for (const [symbol, variable] of computationStore.variables.entries()) {
        if (symbol === originalSymbol) {
          value =
            typeof variable.value === "number" ? variable.value : undefined;
          variableRole = variable.role || "constant";
          // Use the variable's precision if defined, otherwise use default
          variablePrecision = variable.precision ?? defaultPrecision;
          // Use the variable's display property if defined, otherwise default to "name"
          display = variable.latexDisplay ?? "name";
          // Get the index variable from the computation store
          indexVariable = variable.index || "";
          // Get custom CSS if defined
          defaultCSS = variable.defaultCSS || "";
          hoverCSS = variable.hoverCSS || "";
          // Only treat variable as having in-formula SVG if svgMode is explicitly set
          hasSVG = !!(
            variable.svgMode &&
            (variable.svgPath || variable.svgContent)
          );
          svgMode = variable.svgMode;
          // Get memberOf relationship
          memberOf = variable.memberOf || "";
          break;
        }
      }
      // Process the variable's body to apply index variable styling AND/OR member variable styling
      let processedBody = token;
      if (indexVariable || memberOf) {
        processedBody = processNestedVariable(variableNode.body, {
          indexVariable: indexVariable || undefined,
          memberOfSymbol: memberOf || undefined,
          defaultPrecision,
          memberDefaultCSS: defaultCSS || undefined,
          memberHoverCSS: hoverCSS || undefined,
          memberValue: value,
        });
      }
      // Use the original symbol as the CSS ID
      const id = originalSymbol;
      // Use different CSS classes based on variable type and interaction mode
      let cssClass: string = VAR_CLASSES.BASE;
      if (variableRole === "input") {
        cssClass = VAR_CLASSES.INPUT;
      } else if (variableRole === "computed") {
        cssClass = VAR_CLASSES.COMPUTED;
      } else if (variableRole === "index") {
        // Index variables are styled like input variables
        cssClass = VAR_CLASSES.INPUT;
      }
      // Inject custom CSS and/or hover CSS into document head if defined
      if (defaultCSS) {
        injectDefaultCSS(id, defaultCSS, value);
      }
      if (hoverCSS) {
        injectHoverCSS(id, hoverCSS, value);
      }
      // Wrap the processed body with CSS classes using the variable's specific precision
      // Show name, value, or both based on display property
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
          return wrapWithExpressionScope(script, operatorType, result);
        }

        // Also register Script nodes that have a Delimited base (e.g., (\left(...\right))^2)
        if (script.base.type === "delimited" && (script.sub || script.sup)) {
          return wrapWithExpressionScope(script, "script-delim", result);
        }

        return result;
      }

      case "frac": {
        const frac = node as Fraction;
        const numerator = processNode(frac.numerator);
        const denominator = processNode(frac.denominator);
        const fracResult = `\\frac{${numerator}}{${denominator}}`;
        return wrapWithExpressionScope(frac, "frac", fracResult);
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
        return wrapWithExpressionScope(matrix, "matrix", matrixResult);
      }

      case "delimited": {
        const delimited = node as Delimited;
        const children = delimited.body.map(processNode).join(" ");
        const delimResult = `\\left${delimited.left}${children}\\right${delimited.right}`;
        return wrapWithExpressionScope(delimited, "delim", delimResult);
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

/**
 * Parse a latex string to find all variable identifiers contained within it.
 * This is useful for identifying which variables are present in a user-provided
 * LaTeX substring (like in a view() call).
 */
export const getVariablesFromLatexString = (latex: string): string[] => {
  try {
    // Get variable patterns from computation store
    const variables = Array.from(computationStore.variables.keys());
    // Parse variable patterns into trees for grouping
    const variableTrees = parseVariableStrings(variables);
    // Create formula tree with variables grouped, passing original symbols
    const formula = deriveTreeWithVars(latex, variableTrees, variables);
    // Collect all variable IDs
    // collectVariableIds expects an AugmentedFormulaNode, but formula is an AugmentedFormula (which has children property)
    // We can iterate over children and collect IDs from each
    const varIds: string[] = [];
    formula.children.forEach((child) => {
      varIds.push(...collectVariableIds(child));
    });
    return varIds;
  } catch (error) {
    console.warn("Failed to parse latex for variables:", error);
    return [];
  }
};
