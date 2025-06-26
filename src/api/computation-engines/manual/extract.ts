import beautify from "js-beautify";

import { IEnvironment } from "../../../types/environment";

interface ExtractResult {
  code: string | null;
  error: string | null;
  isLoading?: boolean;
}

/**
 * Replace `// @view` comments with `view()` function calls for breakpoint debugging
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
  const viewCommentRegex = /^(\s*)\/\/\s*@view.*$/gim;
  return code.replace(viewCommentRegex, (_, leadingWhitespace) => {
    return `${leadingWhitespace}view();`;
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

  // Environment loaded but no manual formula found
  if (!environment.formulas?.[0]?.manual) {
    return {
      code: null,
      error: "No manual formula found in environment",
    };
  }

  const func = environment.formulas[0].manual;
  const functionString = func.toString();

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
