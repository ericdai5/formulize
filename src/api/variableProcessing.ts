import { INPUT_VARIABLE_DEFAULT, IVariableInput } from "../types/variable";
import { computationStore } from "./computation";

/**
 * Process a variable identifier and return its configuration
 */
export const getInputVariableState = (
  varElement: string,
  variableRanges: Record<string, [number, number]> = {}
): IVariableInput | null => {
  // Handle both simple and complex variable names
  // Simple: var-x, var-y, var-alpha
  // Complex: var-P(B\mid A), var-x_1, etc.
  const varMatch = varElement.match(/^var-(.+)$/);
  if (!varMatch) return null;

  const symbol = varMatch[1];
  const varId = `var-${symbol}`;
  const variable = computationStore.variables.get(varId);
  let minValue = INPUT_VARIABLE_DEFAULT.MIN_VALUE;
  let maxValue = INPUT_VARIABLE_DEFAULT.MAX_VALUE;
  let stepSize = INPUT_VARIABLE_DEFAULT.STEP_SIZE;

  if (variable?.step) {
    stepSize = variable.step;
  }

  // Check for range by varId first, then by symbol
  const range = variableRanges[varId] || variableRanges[symbol];
  if (range) {
    [minValue, maxValue] = range;
  }

  return {
    value: variable?.value || INPUT_VARIABLE_DEFAULT.VALUE,
    minValue,
    maxValue,
    stepSize,
    symbol,
    varId,
  };
};

/**
 * Process LaTeX content to handle variables and interactive elements
 */
export const processLatexContent = (latex: string): string => {
  // Get all variable symbols from the computation store for matching
  const allVariableSymbols = Array.from(computationStore.variables.values())
    .map((variable) => variable.symbol)
    .sort((a, b) => b.length - a.length); // Sort by length descending to match longer names first

  let tempLatex = latex;

  // Keep track of processed variables to avoid reprocessing
  const processedVariableLatex: string[] = [];
  const placeholderPrefix = "___VAR___";

  // Process ALL variables (both simple and complex) in one pass
  for (const symbol of allVariableSymbols) {
    const varId = `var-${symbol}`;
    const variable = computationStore.variables.get(varId);

    if (variable) {
      // For complex variables with LaTeX commands, try multiple representations
      let symbolVariations: string[] = [];

      if (symbol.includes("\\")) {
        // Complex variable with LaTeX commands
        symbolVariations = [
          symbol, // Original: P(B\mid A)
          symbol.replace(/\\/g, "\\\\"), // Double escaped: P(B\\mid A)
          symbol.replace(/\\\\/g, "\\\\\\\\"), // Quadruple escaped: P(B\\\\mid A)
        ];
      } else {
        // Simple variable - match exactly
        symbolVariations = [symbol];
      }

      for (const variation of symbolVariations) {
        // Escape special regex characters for safe matching
        const escapedVariation = variation.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        let symbolRegex: RegExp;
        if (symbol.length === 1 && /^[a-zA-Z]$/.test(symbol)) {
          // Single letter variable - use simple global matching, we'll filter manually
          symbolRegex = new RegExp(escapedVariation, "g");
        } else {
          // Complex variable or multi-character - use exact match
          symbolRegex = new RegExp(escapedVariation, "g");
        }

        const beforeReplace = tempLatex;

        if (symbol.length === 1 && /^[a-zA-Z]$/.test(symbol)) {
          // For single letters, exclude matches that are part of long letter sequences (English words)
          // or already within processed variable placeholders
          tempLatex = tempLatex.replace(
            symbolRegex,
            (match, offset, string) => {
              // Check if this match is actually inside a placeholder (not just near one)
              // Look for the specific pattern: ___VAR___[number]___
              let insidePlaceholder = false;

              // Find the nearest placeholder start before this position
              const searchStart = Math.max(0, offset - 30);
              const beforeText = string.substring(
                searchStart,
                offset + match.length
              );

              // Check if we're between ___VAR___[number]___ markers
              const placeholderPattern = /___VAR___\d+___/g;
              let placeholderMatch;
              while (
                (placeholderMatch = placeholderPattern.exec(beforeText)) !==
                null
              ) {
                const placeholderStart = searchStart + placeholderMatch.index;
                const placeholderEnd =
                  placeholderStart + placeholderMatch[0].length;

                // If our variable position is inside this placeholder, skip it
                if (offset >= placeholderStart && offset < placeholderEnd) {
                  insidePlaceholder = true;
                  break;
                }
              }

              if (insidePlaceholder) {
                return match;
              }

              // Generate the LaTeX but replace it with a placeholder for now
              const variableLatex = processVariableToLatex(symbol, variable);
              const placeholderIndex = processedVariableLatex.length;
              processedVariableLatex.push(variableLatex);
              return `${placeholderPrefix}${placeholderIndex}___`;
            }
          );
        } else {
          // For complex variables, simple replacement with placeholder protection
          tempLatex = tempLatex.replace(
            symbolRegex,
            (match, offset, string) => {
              // Check if this match is actually inside a placeholder (not just near one)
              let insidePlaceholder = false;

              // Find the nearest placeholder start before this position
              const searchStart = Math.max(0, offset - 30);
              const beforeText = string.substring(
                searchStart,
                offset + match.length
              );

              // Check if we're between ___VAR___[number]___ markers
              const placeholderPattern = /___VAR___\d+___/g;
              let placeholderMatch;
              while (
                (placeholderMatch = placeholderPattern.exec(beforeText)) !==
                null
              ) {
                const placeholderStart = searchStart + placeholderMatch.index;
                const placeholderEnd =
                  placeholderStart + placeholderMatch[0].length;

                // If our variable position is inside this placeholder, skip it
                if (offset >= placeholderStart && offset < placeholderEnd) {
                  insidePlaceholder = true;
                  break;
                }
              }

              if (insidePlaceholder) {
                return match;
              }

              // Generate the LaTeX but replace it with a placeholder for now
              const variableLatex = processVariableToLatex(symbol, variable);
              const placeholderIndex = processedVariableLatex.length;
              processedVariableLatex.push(variableLatex);
              return `${placeholderPrefix}${placeholderIndex}___`;
            }
          );
        }

        if (beforeReplace !== tempLatex) {
          // console.log(`LaTeX after replacing ${variation}:`, tempLatex);
          break; // Found a match, no need to try other variations
        }
      }
    }
  }

  // Restore variable LaTeX from placeholders FIRST
  tempLatex = tempLatex.replace(
    new RegExp(`${placeholderPrefix}(\\d+)___`, "g"),
    (match, index) => {
      const idx = parseInt(index);
      const replacement = processedVariableLatex[idx];
      return replacement || match; // Keep original if undefined
    }
  );

  // Handle remaining LaTeX commands AFTER variable restoration
  const latexCommands: string[] = [];
  const latexPlaceholderPrefix = "___LATEXCMD___";

  // Replace remaining LaTeX commands with numbered placeholders
  tempLatex = tempLatex.replace(
    /\\[a-zA-Z]+(\{[^}]*\}|\[[^\]]*\])*|\\[^a-zA-Z]/g,
    (match) => {
      const index = latexCommands.length;
      latexCommands.push(match);
      return `${latexPlaceholderPrefix}${index}___`;
    }
  );

  // Restore LaTeX commands from placeholders
  const finalLatex = tempLatex.replace(
    new RegExp(`${latexPlaceholderPrefix}(\\d+)___`, "g"),
    (_, index) => latexCommands[parseInt(index)]
  );
  return finalLatex;
};

/**
 * Convert a variable to its LaTeX representation
 */
const processVariableToLatex = (
  token: string,
  variable: { type: string; value: number; precision?: number }
): string => {
  const { value, type, precision = 1 } = variable;

  if (type === "constant") {
    return value.toString();
  }

  // Create a safe CSS ID by encoding special characters
  // Simple variables like 'x' remain as 'var-x'
  // Complex variables get encoded: 'P(B\mid A)' -> 'var-P_40_B_92_mid_32_A_41_'
  let safeCssId: string;
  if (token.length === 1 && /^[a-zA-Z]$/.test(token)) {
    // Simple single-letter variable - no encoding needed
    safeCssId = `var-${token}`;
  } else {
    // Complex variable - encode special characters
    safeCssId = `var-${token}`.replace(/[^a-zA-Z0-9_-]/g, (char) => {
      return `_${char.charCodeAt(0)}_`;
    });
  }

  if (type === "input") {
    return `\\cssId{${safeCssId}}{\\class{interactive-var-slidable}{${token}: ${value.toFixed(
      precision
    )}}}`;
  }

  if (type === "dependent") {
    return `\\cssId{${safeCssId}}{\\class{interactive-var-dependent}{${token}: ${value.toFixed(
      precision
    )}}}`;
  }

  return `\\class{interactive-var-${type}}{${token}}`;
};
