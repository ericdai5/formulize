/**
 * SVG Integration Module for Formula Editor
 * Exports all SVG-related utilities for embedding SVGs in MathML formulas
 */

export {
  createSVGElement,
  registerSVG,
  registerDefaultIcons,
  type SVGConfig,
} from "./svg-registry";

export { injectVariableSVGs, type SVGPlaceholder } from "./svg-processor";
