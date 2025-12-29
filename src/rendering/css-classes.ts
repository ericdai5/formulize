/**
 * Centralized CSS class names for interactive variables
 */
export const VAR_CLASSES = {
  BASE: "var-base",
  INPUT: "var-input",
  COMPUTED: "var-computed",
  INDEX: "var-index",
} as const;

/**
 * Helper to get all interactive variable class selectors
 */
export const VAR_SELECTORS = {
  BASE: `.${VAR_CLASSES.BASE}`,
  INPUT: `.${VAR_CLASSES.INPUT}`,
  COMPUTED: `.${VAR_CLASSES.COMPUTED}`,
  INDEX: `.${VAR_CLASSES.INDEX}`,
  ALL: ".var-base, .var-input, .var-computed",
  INPUT_AND_COMPUTED: ".var-input, .var-computed",
  ANY: '[class*="var-"]',
} as const;

/**
 * Static styles to prevent re-renders for react flow handles
 * In React, when you pass an inline object (like style={{...}}), a new object
 * reference is created each time, causing React to think the props changed and
 * triggering a re-render.
 */
export const HANDLE_STYLE = {
  opacity: 0,
  pointerEvents: "none" as const,
  width: 1,
  height: 1,
};
