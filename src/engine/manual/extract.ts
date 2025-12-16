import beautify from "js-beautify";

import { IEnvironment } from "../../types/environment";

interface ExtractResult {
  code: string | null;
  error: string | null;
  isLoading?: boolean;
}

/**
 * Replace `// @view` comments with `view()` function calls for breakpoint debugging
 * Supports formats:
 * - // @view variableName->"description"
 * - // @view variableName->"description"->"variableName"
 * @param code - The JavaScript code containing `// @view` comments
 * @returns Code with comments replaced by function calls
 */
export function addViewFunctions(code: string): string {
  // Replace `// @view` comments (case insensitive) with `view()` function calls
  // This regex matches:
  // - Optional whitespace at start of line
  // - // followed by optional whitespace
  // - @view (case insensitive)
  // - Optional additional text after @view
  // - End of line
  const viewCommentRegex = /^(\s*)\/\/\s*@view(.*)$/gim;
  return code.replace(viewCommentRegex, (_match, leadingWhitespace, params) => {
    // Parse parameters from the comment
    const trimmedParams = params.trim();

    if (trimmedParams) {
      // Parse the format: expression->"description"->"variableName"
      // Support both quoted and unquoted expressions
      // Try 3-argument format with quoted expression first: "expression"->"description"->"variableName"
      let paramMatch = trimmedParams.match(/^"([^"]+)"->"([^"]+)"->"([^"]+)"$/);
      if (paramMatch) {
        const [, expression, description, variableName] = paramMatch;
        const escapedDescription = description.replace(/"/g, '\\"');
        return `${leadingWhitespace}view([["${expression}", "${escapedDescription}", "${variableName}"]]);`;
      }
      // Try 3-argument format with unquoted expression: expression->"description"->"variableName"
      paramMatch = trimmedParams.match(/^([^"]+?)->"([^"]+)"->"([^"]+)"$/);
      if (paramMatch) {
        const [, expression, description, variableName] = paramMatch;
        const escapedExpression = expression.trim().replace(/"/g, '\\"');
        const escapedDescription = description.replace(/"/g, '\\"');
        return `${leadingWhitespace}view([["${escapedExpression}", "${escapedDescription}", "${variableName}"]]);`;
      }
      // Try quoted expression 2-argument format: "expression"->"description"
      paramMatch = trimmedParams.match(/^"([^"]+)"->"([^"]+)"$/);
      if (paramMatch) {
        const [, expression, description] = paramMatch;
        // Expression is already properly quoted in the comment, use it directly
        const escapedDescription = description.replace(/"/g, '\\"');
        return `${leadingWhitespace}view([["${expression}", "${escapedDescription}"]]);`;
      }
      // Try unquoted expression 2-argument format: expression->"description"
      paramMatch = trimmedParams.match(/^([^"]+?)->"([^"]+)"$/);
      if (paramMatch) {
        const [, expression, description] = paramMatch;
        // Escape quotes in unquoted expression
        const escapedExpression = expression.trim().replace(/"/g, '\\"');
        const escapedDescription = description.replace(/"/g, '\\"');
        return `${leadingWhitespace}view([["${escapedExpression}", "${escapedDescription}"]]);`;
      }
    }

    // No parameters or invalid format, use default view() call with empty array
    return `${leadingWhitespace}view([]);`;
  });
}

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
  // Use manualSource if available (preserves comments), otherwise fall back to toString()
  const functionString = environment.semantics.manualSource || func.toString();

  // Extract function body without any transformations
  let functionBody = "";
  try {
    const bodyStart = functionString.indexOf("{");
    const bodyEnd = functionString.lastIndexOf("}");
    if (bodyStart !== -1 && bodyEnd !== -1) {
      functionBody = functionString.substring(bodyStart + 1, bodyEnd).trim();
    }

    // Replace @view comments with view() function calls
    const processedFunctionBody = addViewFunctions(functionBody);

    // Wrap the function body in a proper function declaration
    const wrappedCode = [
      "function executeManualFunction() {",
      processedFunctionBody,
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
