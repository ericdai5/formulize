import { processLatexContent } from "../../parse/variable";
import { injectVariableSVGs } from "../svg/svg-processor";

export interface FormulaNodeData {
  latex: string;
  environment?: {
    fontSize?: number;
    semantics?: {
      mode?: string;
    };
  };
}

/**
 * Render a formula using MathJax and inject interactive variable elements
 * @param container - The container element (typically the formula node ref)
 * @param data - The formula data containing latex and environment settings
 * @param isInitialized - Whether MathJax has been initialized
 * @returns Promise that resolves when rendering is complete
 */
export async function renderFormulaWithMathJax(
  container: HTMLElement | null,
  data: FormulaNodeData,
  isInitialized: boolean
): Promise<void> {
  if (!container || !isInitialized) return;

  const { latex, environment } = data;

  try {
    // Find the formula content container
    const renderedLatex = container.querySelector(
      ".rendered-latex"
    ) as HTMLElement;
    if (!renderedLatex) {
      console.warn("Formula content container not found");
      return;
    }

    // Clear previous MathJax content from formula container only
    window.MathJax.typesetClear([renderedLatex]);

    // Process the LaTeX to include interactive elements
    let processedLatex;
    try {
      processedLatex = processLatexContent(latex);
    } catch (latexError) {
      console.error("Error processing LaTeX content:", latexError);
      processedLatex = latex; // Fallback to original latex
    }

    // Default to 2em for canvas formulas (was previously handled by MathJax scale: 2.0)
    const fontSize = environment?.fontSize || 2;

    // Create div element via DOM APIs to avoid XSS risk
    const formulaDiv = document.createElement("div");
    formulaDiv.style.fontSize = `${fontSize}em`;
    formulaDiv.textContent = `\\(\\displaystyle ${processedLatex}\\)`;

    // Clear and append the new element
    renderedLatex.innerHTML = "";
    renderedLatex.appendChild(formulaDiv);

    await window.MathJax.typesetPromise([renderedLatex]);

    // Check if container is still valid after async operation
    if (!container.isConnected) {
      console.warn("Container ref became null during async operations");
      return;
    }

    // Inject SVG elements for variables after MathJax rendering
    try {
      injectVariableSVGs(renderedLatex);
    } catch (svgError) {
      console.error("Error injecting variable SVGs:", svgError);
    }
  } catch (error) {
    console.error("Error rendering formula:", error);
  }
}
