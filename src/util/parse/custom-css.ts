import { ComputationStore } from "../../store/computation";

/**
 * Get or create the shared style element for custom variable styles
 */
const getOrCreateStyleElement = (): CSSStyleSheet | null => {
  let styleElement = document.getElementById(
    "custom-var-styles"
  ) as HTMLStyleElement;
  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = "custom-var-styles";
    document.head.appendChild(styleElement);
  }
  const sheet = styleElement.sheet;
  if (!sheet) {
    console.error("[customCSS] No stylesheet available");
  }
  return sheet;
};

/**
 * Inject default CSS for a specific variable ID
 * Supports {value} placeholder that gets replaced with the variable's computed value
 */
export const injectDefaultCSS = (
  varId: string,
  defaultCSS: string,
  computationStore: ComputationStore,
  value?: number
): void => {
  const sheet = getOrCreateStyleElement();
  if (!sheet) return;

  // Replace {value} placeholder with actual value if provided
  let processedCSS = defaultCSS;
  if (value !== undefined && value !== null && !isNaN(value)) {
    processedCSS = defaultCSS.replace(/\{value\}/g, value.toString());
  }

  // Skip cache check if CSS contains {value} placeholder (needs dynamic updates)
  const hasDynamicValue = defaultCSS.includes("{value}");
  const cachedCSS = computationStore.injectedDefaultCSS.get(varId);
  if (!hasDynamicValue && cachedCSS === processedCSS) return;

  const escapedId = CSS.escape(varId);

  // Remove existing rules if present
  for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
    const rule = sheet.cssRules[i] as CSSStyleRule;
    if (
      rule.selectorText === `#${escapedId}` ||
      rule.selectorText === `.label-flow-node #${escapedId}`
    ) {
      sheet.deleteRule(i);
    }
  }

  // Add rules for both formula nodes and label nodes
  const cssRule = `#${escapedId} { ${processedCSS} }`;
  const labelCssRule = `.label-flow-node #${escapedId} { ${processedCSS} }`;
  sheet.insertRule(cssRule, sheet.cssRules.length);
  sheet.insertRule(labelCssRule, sheet.cssRules.length);
  computationStore.injectedDefaultCSS.set(varId, processedCSS);
};

/**
 * Inject hover CSS for a specific variable ID
 * Supports {value} placeholder that gets replaced with the variable's computed value
 */
export const injectHoverCSS = (
  varId: string,
  hoverCSS: string,
  computationStore: ComputationStore,
  value?: number
): void => {
  const sheet = getOrCreateStyleElement();
  if (!sheet) return;

  // Replace {value} placeholder with actual value if provided
  let processedCSS = hoverCSS;
  if (value !== undefined && value !== null && !isNaN(value)) {
    processedCSS = hoverCSS.replace(/\{value\}/g, value.toString());
  }

  // Skip cache check if CSS contains {value} placeholder (needs dynamic updates)
  const hasDynamicValue = hoverCSS.includes("{value}");
  const cachedHoverCSS = computationStore.injectedHoverCSS.get(varId);
  if (!hasDynamicValue && cachedHoverCSS === processedCSS) return;

  const escapedId = CSS.escape(varId);

  // Remove existing hover rules if present
  for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
    const rule = sheet.cssRules[i] as CSSStyleRule;
    if (
      rule.selectorText === `#${escapedId}.hovered` ||
      rule.selectorText === `.label-flow-node #${escapedId}.hovered`
    ) {
      sheet.deleteRule(i);
    }
  }

  // Add hover rules for both formula nodes and label nodes
  const hoverRule = `#${escapedId}.hovered { ${processedCSS} }`;
  const labelHoverRule = `.label-flow-node #${escapedId}.hovered { ${processedCSS} }`;
  sheet.insertRule(hoverRule, sheet.cssRules.length);
  sheet.insertRule(labelHoverRule, sheet.cssRules.length);
  computationStore.injectedHoverCSS.set(varId, processedCSS);
};
