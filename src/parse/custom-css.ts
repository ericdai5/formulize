import { computationStore } from "../store/computation";

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
 */
export const injectDefaultCSS = (varId: string, defaultCSS: string): void => {
  const sheet = getOrCreateStyleElement();
  if (!sheet) return;

  const cachedCSS = computationStore.injectedDefaultCSS.get(varId);
  if (cachedCSS === defaultCSS) return;

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
  const cssRule = `#${escapedId} { ${defaultCSS} }`;
  const labelCssRule = `.label-flow-node #${escapedId} { ${defaultCSS} }`;
  sheet.insertRule(cssRule, sheet.cssRules.length);
  sheet.insertRule(labelCssRule, sheet.cssRules.length);
  computationStore.injectedDefaultCSS.set(varId, defaultCSS);
};

/**
 * Inject hover CSS for a specific variable ID
 */
export const injectHoverCSS = (varId: string, hoverCSS: string): void => {
  const sheet = getOrCreateStyleElement();
  if (!sheet) return;

  const cachedHoverCSS = computationStore.injectedHoverCSS.get(varId);
  if (cachedHoverCSS === hoverCSS) return;

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
  const hoverRule = `#${escapedId}.hovered { ${hoverCSS} }`;
  const labelHoverRule = `.label-flow-node #${escapedId}.hovered { ${hoverCSS} }`;
  sheet.insertRule(hoverRule, sheet.cssRules.length);
  sheet.insertRule(labelHoverRule, sheet.cssRules.length);
  computationStore.injectedHoverCSS.set(varId, hoverCSS);
};
