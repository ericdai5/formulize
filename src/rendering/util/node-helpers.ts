import { Node } from "@xyflow/react";

//--------------------------------------------------
// Node Types
//--------------------------------------------------

/**
 * Node type constants for type-safe node filtering
 */
export const NODE_TYPES = {
  FORMULA: "formula",
  VARIABLE: "variable",
  LABEL: "label",
  VIEW: "view",
  EXPRESSION: "expression",
} as const;

//--------------------------------------------------
// Node Finders
//--------------------------------------------------

/**
 * Iterate through all measured formula nodes with their DOM elements
 * @param nodes - Array of all React Flow nodes
 * @param callback - Function to call for each valid formula node
 */
export function forEachFormulaNode(
  nodes: Node[],
  callback: (formulaNode: Node, formulaElement: Element, id: string) => void
): void {
  const formulaNodes = nodes.filter((n) => n.type === NODE_TYPES.FORMULA);
  formulaNodes.forEach((formulaNode) => {
    if (!formulaNode.measured) return;
    const id = formulaNode.data.id;
    if (!id || typeof id !== "string") return;
    const formulaElement = getFormulaElement(formulaNode);
    if (!formulaElement) return;
    callback(formulaNode, formulaElement, id);
  });
}

/**
 * Find a formula node by its id
 * @param nodes - Array of all React Flow nodes
 * @param id - The id to search for
 * @returns The formula node or undefined if not found
 */
export function findFormulaNodeById(
  nodes: Node[],
  id: string
): Node | undefined {
  return nodes.find(
    (node) => node.type === NODE_TYPES.FORMULA && node.data.id === id
  );
}

/**
 * Find all label nodes for a specific formula
 * @param nodes - Array of all React Flow nodes
 * @param id - The id to filter by
 * @returns Array of label nodes for this formula
 */
export function findLabelNodesById(nodes: Node[], id: string): Node[] {
  return nodes.filter(
    (node) => node.type === NODE_TYPES.LABEL && node.data.id === id
  );
}

/**
 * Find variable nodes by varId (CSS identifier) within a specific formula
 * @param nodes - Array of all React Flow nodes
 * @param id - The id to filter by
 * @param varId - The variable identifier (cssId)
 * @returns Array of matching variable nodes
 */
export function findVariableNodesByVarId(
  nodes: Node[],
  id: string,
  varId: string
): Node[] {
  const formulaNode = findFormulaNodeById(nodes, id);
  if (!formulaNode) return [];
  return nodes.filter(
    (node) =>
      node.type === NODE_TYPES.VARIABLE &&
      node.parentId === formulaNode.id &&
      node.data.varId === varId
  );
}

//--------------------------------------------------
// DOM Helpers
//--------------------------------------------------

/**
 * Get the DOM element for a formula node by its React Flow node ID
 * @param formulaNode - The React Flow formula node
 * @returns The formula DOM element or null if not found
 */
export function getFormulaElement(formulaNode: Node): Element | null {
  return document.querySelector(`[data-id="${formulaNode.id}"] .formula-node`);
}

/**
 * Get the formula DOM element from a container or fallback to document query
 * @param containerElement - Optional container element to search within
 * @param nodes - Array of all React Flow nodes (needed for fallback)
 * @param formulaId - The formula ID to find
 * @returns The formula DOM element or null if not found
 */
export function getFormulaElementFromContainer(
  containerElement: Element | null | undefined,
  nodes: Node[],
  formulaId: string
): Element | null {
  if (containerElement) {
    return containerElement.querySelector(".formula-node");
  }
  // Fall back to document query
  const formulaNode = findFormulaNodeById(nodes, formulaId);
  if (formulaNode) {
    return getFormulaElement(formulaNode);
  }
  return null;
}

/**
 * Calculate position and dimensions of an element relative to a formula element
 * @param elementRect - DOMRect of the element
 * @param formulaRect - DOMRect of the formula element
 * @param viewport - The React Flow viewport (for zoom adjustment)
 * @returns Position and dimensions adjusted for zoom
 */
export function getRelativePositionAndDimensions(
  elementRect: DOMRect,
  formulaRect: DOMRect,
  viewport: { zoom: number }
): {
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
} {
  return {
    position: {
      x: (elementRect.left - formulaRect.left) / viewport.zoom,
      y: (elementRect.top - formulaRect.top) / viewport.zoom,
    },
    dimensions: {
      width: elementRect.width / viewport.zoom,
      height: elementRect.height / viewport.zoom,
    },
  };
}

//--------------------------------------------------
// Node Getters
//--------------------------------------------------

/**
 * Get all nodes of a specific type from the node array
 * @param nodes - Array of all React Flow nodes
 * @param type - The node type to filter by (from NODE_TYPES)
 * @returns Array of nodes matching the specified type
 */
export function getNodesByType(nodes: Node[], type: string): Node[] {
  return nodes.filter((node) => node.type === type);
}

// Convenience functions for common node types
export const getFormulaNodes = (nodes: Node[]) =>
  getNodesByType(nodes, NODE_TYPES.FORMULA);
export const getLabelNodes = (nodes: Node[]) =>
  getNodesByType(nodes, NODE_TYPES.LABEL);
export const getVariableNodes = (nodes: Node[]) =>
  getNodesByType(nodes, NODE_TYPES.VARIABLE);
export const getExpressionNodes = (nodes: Node[]) =>
  getNodesByType(nodes, NODE_TYPES.EXPRESSION);
export const getViewNodes = (nodes: Node[]) =>
  getNodesByType(nodes, NODE_TYPES.VIEW);

/**
 * Extract unique formula IDs from an array of nodes
 * @param nodes - Array of React Flow nodes (typically label or variable nodes)
 * @returns Set of unique ids
 */
export function extractIds(nodes: Node[]): Set<string> {
  const ids = new Set<string>();
  nodes.forEach((node) => {
    const id = node.data.id;
    if (id && typeof id === "string") {
      ids.add(id);
    }
  });
  return ids;
}

//--------------------------------------------------
// Node Measurement Checkers
//--------------------------------------------------

/**
 * Check if all nodes in the given array are measured
 * @param nodes - Array of nodes to check
 * @returns Whether all nodes are measured (or true if array is empty)
 */
export function checkNodesMeasured(nodes: Node[]): boolean {
  if (nodes.length === 0) return true;
  return nodes.every((node) => node.measured);
}

/**
 * Check if all nodes (labels, views, and their corresponding variables) are ready for positioning
 * @param nodes - Array of all React Flow nodes
 * @returns Object containing node arrays and overall readiness status
 */
export function checkAllNodesMeasured(nodes: Node[]): {
  labelNodes: Node[];
  viewNodes: Node[];
  allReady: boolean;
} {
  const labelNodes = getLabelNodes(nodes);
  const viewNodes = getViewNodes(nodes);
  const variableNodes = getVariableNodes(nodes);
  const labelNodesMeasured = checkNodesMeasured(labelNodes);
  const viewNodesMeasured = checkNodesMeasured(viewNodes);
  const variableNodesMeasured = checkNodesMeasured(variableNodes);
  return {
    labelNodes,
    viewNodes,
    allReady: labelNodesMeasured && viewNodesMeasured && variableNodesMeasured,
  };
}

/**
 * Position view nodes to avoid label collisions and make them visible
 * @param currentNodes - Current array of nodes
 * @param formulaNode - The parent formula node
 * @returns Updated array of nodes with positioned and visible view nodes
 */
export function positionAndShowViewNodes(
  currentNodes: Node[],
  formulaNode: Node
): Node[] {
  return currentNodes.map((node) => {
    if (node.type === NODE_TYPES.VIEW) {
      // Calculate the view node X center position
      const viewCenterX = node.position.x;

      // Calculate Y position that avoids label collisions
      const newY = getViewNodeYPositionAvoidingLabels(
        currentNodes,
        formulaNode,
        viewCenterX
      );

      return {
        ...node,
        position: { x: node.position.x, y: newY },
        style: {
          ...node.style,
          opacity: 1, // Make visible
          pointerEvents: "auto" as const, // Enable interactions
        },
      };
    }
    return node;
  });
}

/**
 * Calculate the optimal Y position for a view node that avoids collisions with label nodes.
 * If there are any labels below the formula, position the view node below all of them.
 *
 * @param nodes - Array of all React Flow nodes
 * @param formulaNode - The parent formula node
 * @param _viewNodeX - The X position (unused, kept for API compatibility)
 * @param baseOffset - Base offset from formula height (default 60)
 * @returns The optimal Y position for the view node
 */
export function getViewNodeYPositionAvoidingLabels(
  nodes: Node[],
  formulaNode: Node,
  _viewNodeX: number,
  baseOffset: number = 25
): number {
  const formulaHeight =
    formulaNode.measured?.height || (formulaNode.height as number) || 200;

  // Find all label nodes that belong to this formula
  const labelNodes = nodes.filter(
    (node) => node.type === NODE_TYPES.LABEL && node.parentId === formulaNode.id
  );

  // If there are no labels, use the base offset
  if (labelNodes.length === 0) {
    return formulaHeight + baseOffset;
  }

  // Find the maximum bottom edge of all labels
  // Labels placed "below" are at Y = formulaHeight + 10 (spacing.vertical)
  // Labels placed "above" are at negative Y
  const defaultLabelHeight = 30;
  let maxLabelBottom = 0;

  for (const labelNode of labelNodes) {
    const labelY = labelNode.position.y;
    const labelHeight = labelNode.measured?.height || defaultLabelHeight;
    const labelBottom = labelY + labelHeight;

    // Only consider labels that are below the formula (positive Y relative to formula)
    if (labelY >= 0) {
      maxLabelBottom = Math.max(maxLabelBottom, labelBottom);
    }
  }

  // If labels are below the formula, position view node below them
  if (maxLabelBottom > 0) {
    const verticalSpacing = 25;
    return maxLabelBottom + verticalSpacing;
  }

  // Otherwise use base offset
  return formulaHeight + baseOffset;
}
