/**
 * SVG Processor for handling SVG in variables
 */
import { computationStore } from "../../store/computation";
import { SVGConfig, createSVGElement } from "./svg-registry";

export interface SVGPlaceholder {
  type: "icon" | "inline" | "custom";
  name: string;
  config?: SVGConfig;
  attributes?: Record<string, string>;
}

/**
 * Inject SVG elements for variables with SVG configuration
 * This function reads SVG configuration directly from variables in the computation store
 */
export const injectVariableSVGs = (container: HTMLElement): void => {
  // Find all elements with IDs (potential variables)
  const allVariableElements = container.querySelectorAll("[id]");

  allVariableElements.forEach((varElement) => {
    try {
      const varId = (varElement as HTMLElement).id;
      const variable = computationStore.variables?.get(varId);

      // Skip if variable doesn't exist or doesn't have SVG configuration
      if (!variable || (!variable.svgPath && !variable.svgContent)) return;

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
      const element =
        varElement.querySelector(
          ".interactive-var-base, .interactive-var-slidable, .interactive-var-dropdown, .interactive-var-dependent"
        ) || varElement;

      // Create SVG element
      let svgElement: SVGElement | HTMLElement;
      const config: SVGConfig = {
        width: variable.svgSize?.width || 16,
        height: variable.svgSize?.height || 16,
        className: "variable-svg-icon",
      };

      if (variable.svgPath) {
        svgElement = createSVGElement(variable.svgPath, config);
      } else if (variable.svgContent) {
        svgElement = createSVGElement(variable.svgContent, config);
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
