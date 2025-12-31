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
// Node Getters
//--------------------------------------------------

/**
 * Get all formula nodes from the node array
 * @param nodes - Array of all React Flow nodes
 * @returns Array of formula nodes
 */
export function getFormulaNodes(nodes: Node[]): Node[] {
  return nodes.filter((node) => node.type === NODE_TYPES.FORMULA);
}

/**
 * Get all label nodes from the node array
 * @param nodes - Array of all React Flow nodes
 * @returns Array of label nodes
 */
export function getLabelNodes(nodes: Node[]): Node[] {
  return nodes.filter((node) => node.type === NODE_TYPES.LABEL);
}

/**
 * Get all variable nodes from the node array
 * @param nodes - Array of all React Flow nodes
 * @returns Array of variable nodes
 */
export function getVariableNodes(nodes: Node[]): Node[] {
  return nodes.filter((node) => node.type === NODE_TYPES.VARIABLE);
}

/**
 * Get all expression nodes from the node array
 * @param nodes - Array of all React Flow nodes
 * @returns Array of expression nodes
 */
export function getExpressionNodes(nodes: Node[]): Node[] {
  return nodes.filter((node) => node.type === NODE_TYPES.EXPRESSION);
}

/**
 * Get all view nodes from the node array
 * @param nodes - Array of all React Flow nodes
 * @returns Array of view nodes
 */
export function getViewNodes(nodes: Node[]): Node[] {
  return nodes.filter((node) => node.type === NODE_TYPES.VIEW);
}

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

/**
 * Check if all label nodes are measured
 * @param nodes - Array of all React Flow nodes
 * @returns Object with labelNodes array and whether all are measured
 */
export function checkLabelNodesMeasured(nodes: Node[]): {
  labelNodes: Node[];
  allMeasured: boolean;
} {
  const labelNodes = getLabelNodes(nodes);
  const measuredLabelNodes = labelNodes.filter((node) => node.measured);
  return {
    labelNodes,
    allMeasured:
      labelNodes.length === 0 ||
      measuredLabelNodes.length === labelNodes.length,
  };
}

/**
 * Check if all view nodes are measured
 * @param nodes - Array of all React Flow nodes
 * @returns Object with viewNodes array and whether all are measured
 */
export function checkViewNodesMeasured(nodes: Node[]): {
  viewNodes: Node[];
  allMeasured: boolean;
} {
  const viewNodes = getViewNodes(nodes);
  const measuredViewNodes = viewNodes.filter((node) => node.measured);
  return {
    viewNodes,
    allMeasured:
      viewNodes.length === 0 || measuredViewNodes.length === viewNodes.length,
  };
}

/**
 * Check if all variable nodes corresponding to label nodes are measured
 * @param nodes - Array of all React Flow nodes
 * @param labelNodes - Array of label nodes to check
 * @returns Whether all corresponding variable nodes are measured
 */
export function checkVariableNodesForLabelsMeasured(
  nodes: Node[],
  labelNodes: Node[]
): boolean {
  const variableNodes = getVariableNodes(nodes);
  return labelNodes.every((labelNode) => {
    const cssId = labelNode.data.varId;
    const labelId = labelNode.data.id;

    if (!cssId || !labelId || typeof labelId !== "string") return false;

    const variableNode = variableNodes.find((vNode) => {
      return (
        vNode.data.varId === cssId &&
        vNode.parentId &&
        typeof vNode.parentId === "string" &&
        vNode.parentId.includes(labelId)
      );
    });

    return variableNode?.measured !== undefined;
  });
}

/**
 * Check if all nodes (labels, views, and their corresponding variables) are ready for positioning
 * @param nodes - Array of all React Flow nodes
 * @returns Object containing node arrays and overall readiness status
 */
export function checkAllNodesMeasuredForPositioning(nodes: Node[]): {
  labelNodes: Node[];
  viewNodes: Node[];
  allReady: boolean;
} {
  const { labelNodes, allMeasured: allLabelsMeasured } =
    checkLabelNodesMeasured(nodes);
  const { viewNodes, allMeasured: allViewNodesMeasured } =
    checkViewNodesMeasured(nodes);
  const allVariableNodesMeasured = checkVariableNodesForLabelsMeasured(
    nodes,
    labelNodes
  );

  return {
    labelNodes,
    viewNodes,
    allReady:
      allLabelsMeasured && allViewNodesMeasured && allVariableNodesMeasured,
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
  baseOffset: number = 60
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
