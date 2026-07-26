/**
 * Centralized CSS class names for interactive variables
 */
export const VAR_CLASSES = {
  ALL: "var",
  BASE: "var-base",
  INPUT: "var-input",
  INDEX: "var-index",
  INSTANCE: "var-instance-",
} as const;

/**
 * Helper to get all interactive variable class selectors
 */
export const VAR_SELECTORS = {
  BASE: `.${VAR_CLASSES.BASE}`,
  INPUT: `.${VAR_CLASSES.INPUT}`,
  INDEX: `.${VAR_CLASSES.INDEX}`,
  ALL: `.${VAR_CLASSES.ALL}`,
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
