/**
 * Vite plugin that automatically extracts the `manual` function source code
 * and adds it as `manualSource` to preserve // @view comments through bundling.
 *
 * This plugin runs before code transformation and captures the original source
 * code including comments, which would otherwise be stripped by the bundler.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from "vite";
 * import react from "@vitejs/plugin-react-swc";
 * import { formulizePlugin } from "formulize-math/vite-plugin";
 *
 * export default defineConfig({
 *   plugins: [formulizePlugin(), react()],
 * });
 * ```
 */
export function formulizePlugin() {
  return {
    name: "vite-plugin-formulize",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      // Only process .ts and .tsx files
      if (!id.endsWith(".ts") && !id.endsWith(".tsx")) {
        return null;
      }

      // Skip node_modules
      if (id.includes("node_modules")) {
        return null;
      }

      // Look for semantics objects with manual functions
      // Pattern: manual: function ... { ... }
      const manualFunctionRegex = /(manual:\s*)(function\s*\([^)]*\)\s*\{)/g;

      if (!manualFunctionRegex.test(code)) {
        return null;
      }

      // Reset regex
      manualFunctionRegex.lastIndex = 0;

      let result = code;
      let match;

      while ((match = manualFunctionRegex.exec(code)) !== null) {
        const startIndex = match.index + match[1].length;
        const functionStart = match[2];

        // Find the matching closing brace
        let braceCount = 1;
        let i = startIndex + functionStart.length;
        while (i < code.length && braceCount > 0) {
          if (code[i] === "{") braceCount++;
          if (code[i] === "}") braceCount--;
          i++;
        }

        // Extract the full function
        const functionEnd = i;
        const fullFunction = code.substring(startIndex, functionEnd);

        // Check if manualSource already exists after this function
        const afterFunction = code.substring(functionEnd, functionEnd + 200);
        if (afterFunction.includes("manualSource:")) {
          continue; // Already has manualSource, skip
        }

        // Escape the function for use in a template literal
        const escapedFunction = fullFunction
          .replace(/\\/g, "\\\\")
          .replace(/`/g, "\\`")
          .replace(/\$\{/g, "\\${");

        // Insert manualSource after the function
        const insertPosition = functionEnd;
        const insertion = `,\n    manualSource: \`${escapedFunction}\``;

        result =
          result.substring(0, insertPosition) +
          insertion +
          result.substring(insertPosition);

        // Adjust regex lastIndex for the insertion
        manualFunctionRegex.lastIndex += insertion.length;
      }

      if (result !== code) {
        return {
          code: result,
          map: null,
        };
      }

      return null;
    },
  };
}
