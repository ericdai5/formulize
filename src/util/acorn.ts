import * as acorn from "acorn";

/**
 * Helper function to extract all declared variable names from JavaScript code.
 * This function parses JavaScript code using the acorn parser and walks through the AST
 * to find all variable declarations (var, let, const), function declarations, and function parameters.
 *
 * @param code - The JavaScript code to parse
 * @returns Array of variable names found in the code
 *
 * @example
 * extractVariableNames("var x = 1; let y = 2; function foo(a, b) {}")
 * // Returns: ["x", "y", "foo", "a", "b"]
 */
export const extractVariableNames = (code: string): string[] => {
  try {
    const ast = acorn.parse(code, {
      ecmaVersion: 5,
      allowReturnOutsideFunction: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const variableNames: string[] = [];

    // Walk through the AST to find variable declarations
    const walkAst = (node: any) => {
      if (!node || typeof node !== "object") return;

      // Handle VariableDeclaration nodes (var, let, const)
      if (node.type === "VariableDeclaration") {
        if (node.declarations && Array.isArray(node.declarations)) {
          for (const declaration of node.declarations) {
            if (declaration.id && declaration.id.name) {
              variableNames.push(declaration.id.name);
            }
            // Handle destructuring assignments like { x, y } = obj
            else if (
              declaration.id &&
              declaration.id.type === "ObjectPattern"
            ) {
              if (declaration.id.properties) {
                for (const prop of declaration.id.properties) {
                  if (prop.value && prop.value.name) {
                    variableNames.push(prop.value.name);
                  } else if (prop.key && prop.key.name) {
                    // Handle shorthand property { x } = obj
                    variableNames.push(prop.key.name);
                  }
                }
              }
            }
            // Handle array destructuring like [a, b] = arr
            else if (declaration.id && declaration.id.type === "ArrayPattern") {
              if (declaration.id.elements) {
                for (const element of declaration.id.elements) {
                  if (element && element.name) {
                    variableNames.push(element.name);
                  }
                }
              }
            }
          }
        }
      }

      // Handle FunctionDeclaration nodes to get function names
      if (node.type === "FunctionDeclaration" && node.id && node.id.name) {
        variableNames.push(node.id.name);
      }

      // Handle function parameters
      if (
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression"
      ) {
        if (node.params && Array.isArray(node.params)) {
          for (const param of node.params) {
            if (param.name) {
              variableNames.push(param.name);
            }
          }
        }
      }

      // Recursively walk through child nodes
      for (const key in node) {
        if (key === "parent") continue; // Avoid circular references
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            walkAst(item);
          }
        } else if (child && typeof child === "object") {
          walkAst(child);
        }
      }
    };

    walkAst(ast);

    // Remove duplicates and return
    return [...new Set(variableNames)];
  } catch (error) {
    console.error("Error parsing code to extract variable names:", error);
    return [];
  }
};

/**
 * Helper function to extract breakpoint positions from JavaScript code.
 * This function parses JavaScript code using the acorn parser and extracts
 * all view() function calls and their positions.
 *
 * @param code - The JavaScript code to parse
 * @returns Array of breakpoint positions found in the code
 *
 * @example
 * extractViews("var x = 1;\nview();\nvar y = 2;")
 * // Returns: [{ start: 11, end: 18, line: 2, column: 0 }]
 */
export const extractViews = (
  code: string
): Array<{
  start: number;
  end: number;
  line?: number;
  column?: number;
}> => {
  try {
    const breakpoints: Array<{
      start: number;
      end: number;
      line?: number;
      column?: number;
    }> = [];

    // Parse the code to get the AST
    const ast = acorn.parse(code, {
      ecmaVersion: 5,
      allowReturnOutsideFunction: true,
      locations: true, // Enable line/column tracking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    // Walk through the AST to find view() function calls
    const walkAst = (node: any) => {
      if (!node || typeof node !== "object") return;

      // Check for CallExpression where callee is an Identifier named 'view'
      if (
        node.type === "CallExpression" &&
        node.callee?.type === "Identifier" &&
        node.callee?.name === "view"
      ) {
        breakpoints.push({
          start: node.start || 0,
          end: node.end || 0,
          line: node.loc?.start?.line,
          column: node.loc?.start?.column,
        });
      }

      // Recursively walk through child nodes
      for (const key in node) {
        if (key === "parent") continue; // Avoid circular references
        const child = node[key];
        if (Array.isArray(child)) {
          for (const item of child) {
            walkAst(item);
          }
        } else if (child && typeof child === "object") {
          walkAst(child);
        }
      }
    };

    walkAst(ast);

    return breakpoints;
  } catch (error) {
    console.error("Error parsing code to extract view() calls:", error);
    return [];
  }
};
