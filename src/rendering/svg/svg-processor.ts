/**
 * SVG Processor for handling SVG in variables
 */
import { ComputationStore } from "../../store/computation";
import { VAR_SELECTORS } from "../css-classes";
import {
  SVGConfig,
  SVGGeneratorContext,
  createSVGElement,
  parseSVGString,
  sanitizeSVG,
} from "./svg-registry";

export interface SVGPlaceholder {
  type: "icon" | "inline" | "custom";
  name: string;
  config?: SVGConfig;
  attributes?: Record<string, string>;
}

/**
 * Inject SVG elements for variables with SVG configuration
 * This function reads SVG configuration directly from variables in the computation store
 * @param container - The container element to process
 * @param computationStore - The computation store to use
 */
export const injectVariableSVGs = (
  container: HTMLElement,
  computationStore: ComputationStore
): void => {
  // Find all elements with IDs (potential variables)
  const allVariableElements = container.querySelectorAll("[id]");

  allVariableElements.forEach((varElement) => {
    try {
      const varId = (varElement as HTMLElement).id;

      // Check if this is a member variable reference (e.g., "N-in-N_0")
      let variable = computationStore.variables?.get(varId);
      if (!variable && varId.includes("-in-")) {
        // Extract the parent variable symbol (e.g., "N" from "N-in-N_0")
        const parentSymbol = varId.split("-in-")[0];
        variable = computationStore.variables?.get(parentSymbol);
      }

      // Skip if variable doesn't exist or doesn't have SVG configuration
      if (!variable || (!variable.svgPath && !variable.svgContent)) return;

      // If svgMode is not explicitly declared, do not inject into formula content
      // Label nodes render SVG via SVGLabel component separately
      if (!variable.svgMode) return;

      // Check if SVG already exists (avoid duplicates)
      if (
        varElement.querySelector(".variable-svg-icon") ||
        varElement.nextElementSibling?.classList.contains(
          "variable-svg-wrapper"
        )
      ) {
        return;
      }

      // For compatibility, look for elements with specific variable classes
      const element = varElement.querySelector(VAR_SELECTORS.ALL) || varElement;

      // Create SVG element
      let svgElement: SVGElement | HTMLElement;
      const config: SVGConfig = {
        width: variable.svgSize?.width,
        height: variable.svgSize?.height,
        className: "variable-svg-icon",
      };

      if (variable.svgPath) {
        svgElement = createSVGElement(variable.svgPath, config);
      } else if (variable.svgContent) {
        if (typeof variable.svgContent === "function") {
          try {
            // Create context with variable data for generator function
            const context: SVGGeneratorContext = {
              ...config,
              value: variable.value,
              variable: variable,
              environment: computationStore.environment || undefined,
            };
            const result = variable.svgContent(context);
            // Handle both string and SVGElement returns
            if (typeof result === "string") {
              // Sanitize SVG string before parsing to prevent XSS attacks
              const sanitizedResult = sanitizeSVG(result);
              svgElement = parseSVGString(sanitizedResult);
            } else if (result instanceof SVGElement) {
              svgElement = result;
            } else {
              console.error(
                `SVG generator function for ${varId} must return a string or SVGElement`,
                result
              );
              return;
            }
            // If the SVG element is from a different document (e.g., from DOMParser),
            // we need to import it into the current document
            if (svgElement.ownerDocument !== document) {
              svgElement = document.importNode(svgElement, true) as SVGElement;
            }

            // Apply dimensions and styling similar to createSVGElement
            const width = config.width;
            const height = config.height;
            if (height === undefined) {
              svgElement.style.height = "0.8em";
              svgElement.style.width = "auto";
              svgElement.removeAttribute("height");
              svgElement.removeAttribute("width");
            } else {
              svgElement.setAttribute("width", width?.toString() || "24");
              svgElement.setAttribute("height", height?.toString() || "24");
            }
            svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");

            if (config.className) {
              svgElement.classList.add(...config.className.split(" "));
            }
          } catch (error) {
            console.error(
              `Error executing SVG generator function for ${varId}:`,
              error
            );
            return;
          }
        } else {
          // Sanitize SVG string before creating element to prevent XSS attacks
          const sanitizedContent = sanitizeSVG(variable.svgContent);
          svgElement = createSVGElement(sanitizedContent, config);
        }
      } else {
        return;
      }

      // Check if we should replace or append based on svgMode
      const svgMode = variable.svgMode || "replace";
      if (svgMode === "append") {
        // Append mode: Add SVG on top of the variable content
        // TO DO: Add custom CSS to the SVG element
        // TO DO: Add position and alignment control to SVG element
        (svgElement as HTMLElement).style.display = "block";
        (svgElement as HTMLElement).style.margin = "0 auto";
        element.insertBefore(svgElement, element.firstChild);
      } else {
        // Replace mode (default): Replace the entire content with the SVG
        (element as HTMLElement).innerHTML = "";
        (element as HTMLElement).appendChild(svgElement);
      }
    } catch (error) {
      console.error("Error injecting variable SVG:", error);
    }
  });
};
