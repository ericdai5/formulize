import * as acorn from "acorn";
import beautify from "js-beautify";

import { ComputationStore } from "../../store/computation";
import { IEnvironment } from "../../types/environment";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Extended AST node type that includes common properties we access.
 * Acorn's Node type is minimal, so we extend it with properties from specific node types.
 */
type ASTNode = acorn.Node & {
  name?: string; // Identifier
  value?: unknown; // Literal
  object?: ASTNode; // MemberExpression
  property?: ASTNode; // MemberExpression
  computed?: boolean; // MemberExpression
  declarations?: ASTNode[]; // VariableDeclaration
  id?: ASTNode; // VariableDeclarator
  init?: ASTNode; // VariableDeclarator
  left?: ASTNode; // AssignmentExpression
  right?: ASTNode; // AssignmentExpression
  // Index signature for dynamic property access in walkAst
  [key: string]: unknown;
};

interface ExtractResult {
  code: string | null;
  error: string | null;
  isLoading?: boolean;
}

/**
 * Result of variable linkage extraction from manual function AST
 */
export interface Linkages {
  // Map of local variable names to computation store variable IDs
  // e.g., { "xi": "x", "probability": "P(x)", "expectedValue": "E" }
  // Can also be an array for expressions involving multiple variables:
  // e.g., { "currExpected": ["x", "P(x)"] } for `currExpected = xi * probability`
  variableLinkage: Record<string, string | string[]>;
  // Map of local variable names to their source computation store arrays
  // e.g., { "xValues": "X", "pxValues": "P(x)" }
  arrayBindings: Record<string, string>;
}

/** Source information for a variable assignment */
interface AssignmentSource {
  type: "vars_access" | "array_index" | "other";
  computationVar?: string;
  arrayVar?: string;
  indexVar?: string;
}

/** A tracked variable assignment from the AST */
interface Assignment {
  localVar: string;
  source: AssignmentSource;
}

/** A tracked expression assignment for multi-linkage detection */
interface ExpressionAssignment {
  localVar: string;
  expression: ASTNode;
}

/** Result of collecting assignments from the AST */
interface CollectedAssignments {
  assignments: Assignment[];
  expressionAssignments: ExpressionAssignment[];
}

// ============================================================================
// Manual Function Extraction
// ============================================================================

export function extractManual(environment: IEnvironment | null): ExtractResult {
  // Environment not loaded yet
  if (!environment) {
    return {
      code: null,
      error: null,
      isLoading: true,
    };
  }

  // Environment loaded but no manual function found in semantics config
  if (!environment.semantics?.manual) {
    return {
      code: null,
      error: "No manual function found in semantics config",
    };
  }

  const func = environment.semantics.manual;
  const functionString = func.toString();
  let functionBody = "";
  try {
    // Find the function body opening brace by looking for { after the closing )
    // This handles destructuring parameters like function({ m, v }) correctly
    const parenCloseIndex = functionString.indexOf(")");
    const bodyStart = functionString.indexOf("{", parenCloseIndex);
    const bodyEnd = functionString.lastIndexOf("}");
    if (bodyStart !== -1 && bodyEnd !== -1) {
      functionBody = functionString.substring(bodyStart + 1, bodyEnd).trim();
    }
    // Wrap the function body in a proper function declaration
    const wrappedCode = [
      "function executeManualFunction() {",
      functionBody,
      "}",
      "",
      "// Parse Formulize variables",
      "var variables = JSON.parse(getVariablesJSON());",
      "",
      "var result = executeManualFunction();",
    ].join("\n");
    // Use js-beautify to properly format the code with correct indentation
    const processedCode = beautify.js(wrappedCode, {
      indent_size: 2,
      space_in_empty_paren: false,
      preserve_newlines: true,
      max_preserve_newlines: 2,
      brace_style: "collapse",
      keep_array_indentation: false,
    });
    return {
      code: processedCode,
      error: null,
    };
  } catch (err) {
    return {
      code: null,
      error: `Failed to extract function body: ${err}`,
    };
  }
}

// ============================================================================
// AST Walking Utilities
// ============================================================================

/**
 * Generic AST walker that calls a visitor function on each node.
 */
function walkAst(
  node: ASTNode | null | undefined,
  visitor: (node: ASTNode) => void
): void {
  // 1. Base case: stop if node is null/undefined or not an object
  if (!node || typeof node !== "object") return;
  // 2. Call the visitor function on the current node
  visitor(node);
  // 3. Recursively walk through all child properties
  for (const key in node) {
    if (key === "parent") continue; // Skip parent refs to avoid infinite loops
    const child = node[key];
    if (Array.isArray(child)) {
      // If child is an array (e.g., function arguments, block statements)
      for (const item of child) {
        walkAst(item as ASTNode, visitor);
      }
    } else if (child && typeof child === "object") {
      // If child is a single object node
      walkAst(child as ASTNode, visitor);
    }
  }
}

/**
 * Check if an AST node is an expression that contains identifiers
 * (e.g., BinaryExpression, CallExpression, etc.)
 */
function isExpressionWithIdentifiers(
  node: ASTNode | null | undefined
): boolean {
  if (!node) return false;
  // Include binary expressions (a * b, a + b), unary expressions, call expressions, etc.
  return [
    "BinaryExpression",
    "UnaryExpression",
    "CallExpression",
    "ConditionalExpression",
    "LogicalExpression",
  ].includes(node.type);
}

/**
 * Recursively extract all identifier names from an expression AST node
 */
function extractIdentifiersFromExpression(node: ASTNode): string[] {
  const identifiers: string[] = [];
  walkAst(node, (n) => {
    if (n.type === "Identifier" && n.name) {
      identifiers.push(n.name);
    }
  });
  return identifiers;
}

/** JavaScript keywords to filter out from identifier extraction */
const JS_KEYWORDS = new Set([
  "var",
  "let",
  "const",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "break",
  "continue",
  "new",
  "this",
  "true",
  "false",
  "null",
  "undefined",
]);

/**
 * Extract the identifier from a view() call's value property using AST parsing.
 * Syntax: view("description", { value: variableName, expression: "..." })
 * @param lineCode - The line of code (a view call)
 * @returns Set containing only the variable from value property, or null if not a view call
 */
function extractViewIdentifier(lineCode: string): Set<string> | null {
  const trimmed = lineCode.trim();
  if (!trimmed.startsWith("view(")) {
    return null;
  }
  try {
    // Wrap in a function body to make it valid JavaScript
    const wrappedCode = `function _wrapper() { ${lineCode} }`;
    const ast = acorn.parse(wrappedCode, {
      ecmaVersion: 5,
    }) as unknown as ASTNode;
    const identifiers = new Set<string>();
    // Walk the AST to find the view() CallExpression
    walkAst(ast, (node) => {
      const callee = node.callee as ASTNode | undefined;
      if (
        node.type === "CallExpression" &&
        callee?.type === "Identifier" &&
        callee?.name === "view"
      ) {
        // Get the second argument (the options object)
        const args = node.arguments as ASTNode[] | undefined;
        if (args && args.length >= 2) {
          const optionsArg = args[1];
          // Look for ObjectExpression with a "value" property
          if (optionsArg?.type === "ObjectExpression") {
            const properties = optionsArg.properties as ASTNode[] | undefined;
            if (properties) {
              for (const prop of properties) {
                // Check if this is the "value" property
                const key = prop.key as ASTNode | undefined;
                const propValue = prop.value as ASTNode | undefined;
                if (
                  key?.type === "Identifier" &&
                  key?.name === "value" &&
                  propValue?.type === "Identifier" &&
                  propValue?.name
                ) {
                  identifiers.add(propValue.name);
                }
              }
            }
          }
        }
      }
    });
    return identifiers;
  } catch (error) {
    console.debug(
      "Failed to parse view() call for identifier extraction:",
      error instanceof Error ? error.message : String(error)
    );
    return new Set();
  }
}

/**
 * Extract all identifiers from a line of JavaScript code
 * For view() calls, only extracts the variable argument (not all identifiers)
 * @param lineCode - The line of code to parse
 * @returns Set of identifier names found in the line
 */
export function extractIdentifiers(lineCode: string): Set<string> {
  // Special handling for view() calls - only extract the variable argument
  const viewIdentifier = extractViewIdentifier(lineCode);
  if (viewIdentifier !== null) {
    return viewIdentifier;
  }

  const identifiers = new Set<string>();
  const trimmed = lineCode.trim();

  // Check if this is a block statement header that needs an empty body to be valid
  const needsBody = /^(for|while|if|else\s+if|switch)\s*\(/.test(trimmed);

  // Wrap in a function body, adding {} for block statements without bodies
  const wrappedCode = needsBody
    ? `function _wrapper() { ${lineCode} {} }`
    : `function _wrapper() { ${lineCode} }`;

  try {
    const ast = acorn.parse(wrappedCode, {
      ecmaVersion: 5,
    }) as unknown as ASTNode;

    walkAst(ast, (node) => {
      if (node.type === "Identifier" && node.name && node.name !== "_wrapper") {
        identifiers.add(node.name);
      }
    });
  } catch (error) {
    // Log parse error at debug/trace level and return empty set
    // This prevents the step handler from crashing on malformed code
    console.debug(
      "Failed to parse code for identifier extraction:",
      error instanceof Error ? error.message : String(error)
    );
    return new Set<string>();
  }

  // Filter out JavaScript keywords
  JS_KEYWORDS.forEach((kw) => identifiers.delete(kw));
  return identifiers;
}

/**
 * Extract just the line from code, for statements excluding the body.
 * For example, for `for (var i = 0; i < n; i++) { ... }`, returns just `for (var i = 0; i < n; i++)`.
 * For `var x = 1;`, returns the full statement.
 * For `view("desc", { value: x })`, returns the full view call including multi-line object.
 *
 * @param code - The code to extract from
 * @returns Just the line without body
 */
export function extractLine(code: string): string {
  const trimmed = code.trim();
  // Check if this is a view() call - need to extract the full call including object argument
  if (trimmed.startsWith("view(")) {
    // Find the matching closing parenthesis for the view call
    let parenDepth = 0;
    let foundOpenParen = false;
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (char === "(") {
        parenDepth++;
        foundOpenParen = true;
      } else if (char === ")") {
        parenDepth--;
        if (foundOpenParen && parenDepth === 0) {
          // Return everything up to and including the closing paren
          return trimmed.substring(0, i + 1);
        }
      }
    }
  }

  // Check if this is a block statement (starts with for, while, if, function, etc.)
  const blockKeywords =
    /^(for|while|if|else|function|switch|try|catch|finally)\s*\(/;
  if (blockKeywords.test(trimmed)) {
    // Find the matching closing parenthesis for the statement header
    let parenDepth = 0;
    let headerEnd = 0;
    let foundOpenParen = false;
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (char === "(") {
        parenDepth++;
        foundOpenParen = true;
      } else if (char === ")") {
        parenDepth--;
        if (foundOpenParen && parenDepth === 0) {
          headerEnd = i + 1;
          break;
        }
      }
    }
    if (headerEnd > 0) {
      return trimmed.substring(0, headerEnd);
    }
  }
  // For other statements, just take the first line
  const firstLineEnd = trimmed.indexOf("\n");
  if (firstLineEnd !== -1) {
    // If the first line ends with '{', strip it
    let firstLine = trimmed.substring(0, firstLineEnd).trim();
    if (firstLine.endsWith("{")) {
      firstLine = firstLine.substring(0, firstLine.length - 1).trim();
    }
    return firstLine;
  }
  return trimmed;
}

/**
 * Extract array access patterns from code (e.g., "xValues[i]" returns ["xValues"])
 * Match patterns like varName[something]
 * @param code - The code to extract from
 * @returns Set of array accesses
 */
export function extractArrayAccess(code: string): Set<string> {
  const arrayAccesses = new Set<string>();
  const arrayAccessRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\[/g;
  let match;
  while ((match = arrayAccessRegex.exec(code)) !== null) {
    arrayAccesses.add(match[1]);
  }
  return arrayAccesses;
}

/**
 * Analyze a MemberExpression AST node to determine the source
 */
function analyzeMemberExpression(node: ASTNode): AssignmentSource | null {
  if (node.type !== "MemberExpression") {
    return null;
  }

  const object = node.object;
  const property = node.property;

  // Pattern: vars.X or vars["X"]
  if (object?.type === "Identifier" && object.name === "vars") {
    let computationVar: string | undefined;
    if (!node.computed && property?.type === "Identifier" && property.name) {
      // vars.X
      computationVar = property.name;
    } else if (
      node.computed &&
      property?.type === "Literal" &&
      property.value !== undefined
    ) {
      // vars["X"] or vars['X']
      computationVar = String(property.value);
    }
    if (computationVar) {
      return { type: "vars_access", computationVar };
    }
  }

  // Pattern: arrayVar[index] (e.g., xValues[i])
  if (object?.type === "Identifier" && object.name && node.computed) {
    const arrayVar = object.name;
    let indexVar: string | undefined;
    if (property?.type === "Identifier" && property.name) {
      indexVar = property.name;
    }
    return { type: "array_index", arrayVar, indexVar };
  }
  return null;
}

// ============================================================================
// Linkage Extraction - Assignment Collection
// ============================================================================

/**
 * Process an initialization expression and categorize it as an assignment or expression.
 */
function processInitExpression(
  localVar: string,
  init: ASTNode | null | undefined,
  assignments: Assignment[],
  expressionAssignments: ExpressionAssignment[]
): void {
  if (!init) return;
  if (init.type === "MemberExpression") {
    const source = analyzeMemberExpression(init);
    if (source) {
      assignments.push({ localVar, source });
    }
  } else if (isExpressionWithIdentifiers(init)) {
    expressionAssignments.push({ localVar, expression: init });
  }
}

/**
 * Walk the AST and collect all variable assignments and expression assignments.
 */
function collectAssignments(ast: ASTNode): CollectedAssignments {
  const assignments: Assignment[] = [];
  const expressionAssignments: ExpressionAssignment[] = [];

  walkAst(ast, (node) => {
    // Handle VariableDeclaration nodes (var only in ES5)
    if (node.type === "VariableDeclaration") {
      if (node.declarations && Array.isArray(node.declarations)) {
        for (const declaration of node.declarations) {
          if (declaration.id?.name && declaration.init) {
            processInitExpression(
              declaration.id.name,
              declaration.init,
              assignments,
              expressionAssignments
            );
          }
        }
      }
    }

    // Handle AssignmentExpression (for reassignments like xi = xValues[i])
    if (
      node.type === "AssignmentExpression" &&
      node.left?.type === "Identifier" &&
      node.left.name
    ) {
      processInitExpression(
        node.left.name,
        node.right,
        assignments,
        expressionAssignments
      );
    }
  });

  return { assignments, expressionAssignments };
}

// ============================================================================
// Linkage Extraction - Resolution
// ============================================================================

/**
 * Find a variable in the computation store that has memberOf matching the given parent variable
 * @param parentVarId - The parent variable ID to search for
 * @param computationStore - Optional scoped computation store (defaults to global)
 */
export function findMemberOfVariable(
  parentVarId: string,
  computationStore: ComputationStore
): string | null {
  for (const [varId, variable] of computationStore.variables.entries()) {
    if (variable.memberOf === parentVarId) {
      return varId;
    }
  }
  return null;
}

/**
 * Resolve direct linkages and array aliases from collected assignments.
 * @param assignments - The collected assignments from AST
 * @param variableLinkage - The linkage map to populate
 * @param arrayBindings - The array bindings map to populate
 * @param computationStore - The scoped computation store to use
 */
function resolveDirectLinkages(
  assignments: Assignment[],
  variableLinkage: Record<string, string | string[]>,
  arrayBindings: Record<string, string>,
  computationStore: ComputationStore
): void {
  for (const { localVar, source } of assignments) {
    if (source.type === "vars_access" && source.computationVar) {
      // Direct access to vars.X
      const computationVar = source.computationVar;
      const variable = computationStore.variables.get(computationVar);
      if (variable) {
        if (Array.isArray(variable.value)) {
          // Array/set creates an alias
          arrayBindings[localVar] = computationVar;
          variableLinkage[localVar] = computationVar;
        } else {
          // Scalar is a direct linkage
          variableLinkage[localVar] = computationVar;
        }
      }
    } else if (source.type === "array_index" && source.arrayVar) {
      // Array index access like xValues[i]
      const parentComputationVar = arrayBindings[source.arrayVar];
      if (parentComputationVar) {
        // Try to find a variable with memberOf matching the parent
        const memberVar = findMemberOfVariable(
          parentComputationVar,
          computationStore
        );
        if (memberVar) {
          variableLinkage[localVar] = memberVar;
        } else {
          // Link directly to the parent computation var if no memberOf
          const variable = computationStore.variables.get(parentComputationVar);
          if (variable && Array.isArray(variable.value)) {
            variableLinkage[localVar] = parentComputationVar;
          }
        }
      }
    }
  }
}

/**
 * Collect all linked computation variables for a set of identifiers.
 * Flattens array linkages into a single array.
 */
function collectLinkedVars(
  identifiers: string[],
  variableLinkage: Record<string, string | string[]>
): string[] {
  const linkedVars: string[] = [];
  for (const id of identifiers) {
    const linked = variableLinkage[id];
    if (linked) {
      if (Array.isArray(linked)) {
        linkedVars.push(...linked);
      } else {
        linkedVars.push(linked);
      }
    }
  }
  return linkedVars;
}

/**
 * Normalize a multi-linkage: deduplicate but KEEP as array.
 */
function normalizeMultiLinkage(linkedVars: string[]): string[] | null {
  if (linkedVars.length === 0) return null;
  const unique = [...new Set(linkedVars)];
  return unique;
}

/**
 * Resolve expression linkages for multi-variable expressions (e.g., xi * probability).
 */
function resolveExpressionLinkages(
  expressionAssignments: ExpressionAssignment[],
  variableLinkage: Record<string, string | string[]>
): void {
  for (const { localVar, expression } of expressionAssignments) {
    // Skip if already has a direct linkage
    if (variableLinkage[localVar]) continue;
    const identifiers = extractIdentifiersFromExpression(expression);
    const linkedVars = collectLinkedVars(identifiers, variableLinkage);
    const normalized = normalizeMultiLinkage(linkedVars);
    if (normalized) {
      variableLinkage[localVar] = normalized;
    }
  }
}

// ============================================================================
// Linkage Extraction - Main Entry Points
// ============================================================================

/**
 * Extract variable linkages by analyzing the AST of a manual function.
 *
 * This function detects three types of patterns:
 * 1. Direct assignments from vars: `var xValues = vars.X` or `var xValues = vars["X"]`
 *    → Creates an array alias mapping (xValues → X)
 *
 * 2. Array index access: `var xi = xValues[i]`
 *    → If xValues is an alias for X, finds a variable with memberOf: "X"
 *    → Links xi to that member variable
 *
 * 3. Expression assignments: `var currExpected = xi * probability`
 *    → Creates multi-linkage to all referenced computation variables
 *
 * @param code - The JavaScript code of the manual function body
 * @returns Object containing variableLinkage and arrayBindings
 */
export function extractLinkages(
  code: string,
  computationStore: ComputationStore
): Linkages {
  const variableLinkage: Record<string, string | string[]> = {};
  const arrayBindings: Record<string, string> = {};
  try {
    const ast = acorn.parse(code, {
      ecmaVersion: 5,
      allowReturnOutsideFunction: true,
    }) as unknown as ASTNode;
    // First pass: collect all variable assignments
    const { assignments, expressionAssignments } = collectAssignments(ast);
    // Second pass: resolve direct linkages and array aliases (use scoped store)
    resolveDirectLinkages(
      assignments,
      variableLinkage,
      arrayBindings,
      computationStore
    );
    // Third pass: resolve expression linkages
    resolveExpressionLinkages(expressionAssignments, variableLinkage);
  } catch (error) {
    console.warn("Error extracting variable linkages:", error);
  }

  return { variableLinkage, arrayBindings };
}

/**
 * Merge auto-detected linkages with user-specified linkages.
 * User-specified linkages take precedence.
 */
export function mergeLinkages(
  autoDetected: Record<string, string | string[]>,
  userSpecified: Record<string, string | string[]> | undefined
): Record<string, string | string[]> {
  return {
    ...autoDetected,
    ...(userSpecified || {}),
  };
}
