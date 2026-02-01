import React from "react";

/**
 * Builds debug styles for node visibility indicators.
 * Used across formula-node, label-node, and step-node components.
 */
export const buildDebugStyles = (
  showBorders: boolean,
  showShadow: boolean
): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  if (showBorders) {
    styles.outline = "1px dashed #60a5fa";
  }
  if (showShadow) {
    styles.backgroundColor = "rgba(96, 165, 250, 0.2)";
  }
  return styles;
};
