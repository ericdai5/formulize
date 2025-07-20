import { Node } from "@xyflow/react";

// Enhanced label positioning system
export interface LabelPlacement {
  x: number;
  y: number;
  placement: "below" | "above";
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  type: "variable" | "label" | "formula";
}

/**
 * Advanced optimal label positioning system that places labels outside formula nodes
 * while maintaining horizontal alignment with their variables
 */
export const getLabelNodePos = (
  varNodePos: { x: number; y: number },
  varNodeDim: { width: number; height: number },
  formulaNode: Node,
  formulaNodeDim: { width: number; height: number },
  existingLabels: NodeBounds[],
  labelText: string,
  viewport: { zoom: number }
): LabelPlacement => {
  // Estimate label dimensions (approximate based on text length and font size)
  const charWidth = 8 / viewport.zoom; // Approximate character width accounting for zoom
  const estimatedLabelWidth = Math.max(
    labelText.length * charWidth,
    40 / viewport.zoom
  );
  const estimatedLabelHeight = 24 / viewport.zoom; // Approximate line height

  // Define spacing constants (adjusted for zoom)
  const spacing = {
    vertical: 2 / viewport.zoom, // Space between formula and labels
    labelSpacing: 8 / viewport.zoom, // Space between multiple labels
  };

  // Calculate the absolute position of the variable (formula position + relative position)
  const formulaNodePos = formulaNode.position;
  const absoluteVariablePosition = {
    x: formulaNodePos.x + varNodePos.x,
    y: formulaNodePos.y + varNodePos.y,
  };

  // Calculate horizontal center of the variable for label alignment
  const variableCenterX = absoluteVariablePosition.x + varNodeDim.width / 2;
  const labelX = variableCenterX - estimatedLabelWidth / 2;

  // Possible placement strategies: above or below the formula node
  const placements: Array<{
    type: LabelPlacement["placement"];
    position: { x: number; y: number };
    priority: number;
  }> = [
    {
      type: "below",
      position: {
        x: labelX,
        y: formulaNodePos.y + formulaNodeDim.height + spacing.vertical,
      },
      priority: 1, // Prefer below
    },
    {
      type: "above",
      position: {
        x: labelX,
        y: formulaNodePos.y - estimatedLabelHeight - spacing.vertical,
      },
      priority: 2, // Then above
    },
  ];

  /**
   * Check if a label position would collide with existing labels
   */
  const hasCollisionWithLabels = (pos: { x: number; y: number }): boolean => {
    const labelBounds = {
      x: pos.x,
      y: pos.y,
      width: estimatedLabelWidth,
      height: estimatedLabelHeight,
    };

    return existingLabels.some((label) => {
      // Check for overlap with other labels
      return !(
        labelBounds.x > label.x + label.width ||
        labelBounds.x + labelBounds.width < label.x ||
        labelBounds.y > label.y + label.height ||
        labelBounds.y + labelBounds.height < label.y
      );
    });
  };

  // Try each placement strategy in order of priority
  for (const placement of placements.sort((a, b) => a.priority - b.priority)) {
    if (!hasCollisionWithLabels(placement.position)) {
      return {
        x: placement.position.x,
        y: placement.position.y,
        placement: placement.type,
      };
    }
  }

  // If there are collisions, try adjusting positions with stacking
  for (const placement of placements) {
    let adjustedY = placement.position.y;

    // For collisions, stack labels by adjusting Y position
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const testPosition = { x: placement.position.x, y: adjustedY };

      if (!hasCollisionWithLabels(testPosition)) {
        return {
          x: testPosition.x,
          y: testPosition.y,
          placement: placement.type,
        };
      }

      // Adjust position for next attempt
      if (placement.type === "below") {
        adjustedY += estimatedLabelHeight + spacing.labelSpacing;
      } else {
        adjustedY -= estimatedLabelHeight + spacing.labelSpacing;
      }
      attempts++;
    }
  }

  // Fallback: use original position even if there might be collision
  const fallbackPlacement = placements[0];
  return {
    x: fallbackPlacement.position.x,
    y: fallbackPlacement.position.y,
    placement: fallbackPlacement.type,
  };
};
