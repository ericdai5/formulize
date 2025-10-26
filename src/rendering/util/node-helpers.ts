import { Node } from "@xyflow/react";

/**
 * Node type constants for type-safe node filtering
 */
export const NODE_TYPES = {
  FORMULA: "formula",
  VARIABLE: "variable",
  LABEL: "label",
  VIEW: "view",
} as const;

/**
 * Find a formula node by its formulaId
 * @param nodes - Array of all React Flow nodes
 * @param formulaId - The formulaId to search for
 * @returns The formula node or undefined if not found
 */
export function findFormulaNodeByFormulaId(
  nodes: Node[],
  formulaId: string
): Node | undefined {
  return nodes.find(
    (node) =>
      node.type === NODE_TYPES.FORMULA && node.data.formulaId === formulaId
  );
}

/**
 * Find all label nodes for a specific formula
 * @param nodes - Array of all React Flow nodes
 * @param formulaId - The formulaId to filter by
 * @returns Array of label nodes for this formula
 */
export function findLabelNodesByFormulaId(
  nodes: Node[],
  formulaId: string
): Node[] {
  return nodes.filter(
    (node) =>
      node.type === NODE_TYPES.LABEL && node.data.formulaId === formulaId
  );
}

/**
 * Find all variable nodes for a specific formula
 * @param nodes - Array of all React Flow nodes
 * @param formulaId - The formulaId to filter by
 * @returns Array of variable nodes for this formula
 */
export function findVariableNodesByFormulaId(
  nodes: Node[],
  formulaId: string
): Node[] {
  const formulaNode = findFormulaNodeByFormulaId(nodes, formulaId);
  if (!formulaNode) return [];
  return nodes.filter(
    (node) =>
      node.type === NODE_TYPES.VARIABLE && node.parentId === formulaNode.id
  );
}

/**
 * Find variable nodes by varId (CSS identifier) within a specific formula
 * @param nodes - Array of all React Flow nodes
 * @param formulaId - The formulaId to filter by
 * @param varId - The variable identifier (cssId)
 * @returns Array of matching variable nodes
 */
export function findVariableNodesByVarId(
  nodes: Node[],
  formulaId: string,
  varId: string
): Node[] {
  const formulaNode = findFormulaNodeByFormulaId(nodes, formulaId);
  if (!formulaNode) return [];
  return nodes.filter(
    (node) =>
      node.type === NODE_TYPES.VARIABLE &&
      node.parentId === formulaNode.id &&
      node.data.varId === varId
  );
}

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
 * Extract unique formula IDs from an array of nodes
 * @param nodes - Array of React Flow nodes (typically label or variable nodes)
 * @returns Set of unique formulaIds
 */
export function extractFormulaIds(nodes: Node[]): Set<string> {
  const formulaIds = new Set<string>();
  nodes.forEach((node) => {
    const formulaId = node.data.formulaId;
    if (formulaId && typeof formulaId === "string") {
      formulaIds.add(formulaId);
    }
  });
  return formulaIds;
}
