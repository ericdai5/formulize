import beautify from "js-beautify";

import { IEnvironment } from "../types/environment";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface ExtractResult {
  code: string | null;
  error: string | null;
  isLoading?: boolean;
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

  // Environment loaded but no semantics function found
  if (!environment.semantics) {
    return {
      code: null,
      error: "No semantics function found in config",
    };
  }

  const func = environment.semantics;
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
