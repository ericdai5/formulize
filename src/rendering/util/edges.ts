import { Edge, Node } from "@xyflow/react";

import {
  extractIds,
  findFormulaNodeById,
  findLabelNodesById,
  findVariableNodesByVarId,
  getLabelNodes,
} from "./node-helpers";

/**
 * Compute edges for a single formula between label nodes and their corresponding variable nodes.
 * @param id - The ID of the formula to process edges for (e.g., "kinetic-energy")
 * @param allNodes - All React Flow nodes (we'll filter internally)
 * @param shouldLabelBeVisible - Predicate function to check if a label should be visible
 * @param createdEdgeIds - Set to track which edge IDs have been created
 * @returns Array of edges for this specific formula
 */
export function computeEdgesForFormula(
  id: string,
  allNodes: Node[],
  shouldLabelBeVisible: (varId: string) => boolean,
  createdEdgeIds: Set<string>
): Edge[] {
  const edges: Edge[] = [];

  // Find the formula node for this id
  const formulaNode = findFormulaNodeById(allNodes, id);
  if (!formulaNode) return edges;

  // Filter label nodes for this specific formula
  const formulaLabelNodes = findLabelNodesById(allNodes, id);

  formulaLabelNodes.forEach((labelNode) => {
    const labelNodeData = labelNode.data as {
      varId?: string;
      id?: string;
    };
    const varId = labelNodeData?.varId;
    if (!varId || !shouldLabelBeVisible(varId)) return;

    // Find matching variable nodes for this formula using the helper
    const matchingVariableNodes = findVariableNodesByVarId(allNodes, id, varId);

    const variableNode = matchingVariableNodes[0];
    if (!variableNode) return;

    // Calculate absolute positions for comparison
    // Both label and variable nodes are now children of the formula node,
    // so we need to add the formula node's position to get absolute coordinates
    const labelAbsoluteY = formulaNode.position.y + labelNode.position.y;
    const variableAbsoluteY = formulaNode.position.y + variableNode.position.y;

    // Determine edge direction based on label position
    const labelIsAbove = labelAbsoluteY < variableAbsoluteY;
    const sourceHandle = labelIsAbove
      ? "label-handle-below"
      : "label-handle-above";
    const targetHandle = labelIsAbove
      ? "variable-handle-top"
      : "variable-handle-bottom";

    const edgeId = `edge-${labelNode.id}-${variableNode.id}`;
    if (createdEdgeIds.has(edgeId)) return;

    const edge: Edge = {
      id: edgeId,
      source: labelNode.id,
      target: variableNode.id,
      sourceHandle,
      targetHandle,
      type: "straight",
      style: {
        stroke: "#cbd5e1",
        strokeWidth: 1,
        strokeDasharray: "2 1",
      },
      animated: false,
      selectable: false,
      deletable: false,
    };

    createdEdgeIds.add(edgeId);
    edges.push(edge);
  });

  return edges;
}

/**
 * Compute edges between label nodes and their corresponding variable nodes for all formulas.
 * Pure function: depends only on provided nodes and the visibility predicate.
 */
export function computeLabelVariableEdges(
  currentNodes: Node[],
  shouldLabelBeVisible: (varId: string) => boolean
): Edge[] {
  const edges: Edge[] = [];
  const createdEdgeIds = new Set<string>();

  // Extract unique formula IDs from label nodes
  const labelNodes = getLabelNodes(currentNodes);
  const ids = extractIds(labelNodes);

  // Process edges for each formula
  ids.forEach((id) => {
    const formulaEdges = computeEdgesForFormula(
      id,
      currentNodes,
      shouldLabelBeVisible,
      createdEdgeIds
    );
    edges.push(...formulaEdges);
  });

  return edges;
}
