import { Edge, Node } from "@xyflow/react";

/**
 * Compute edges for a single formula between label nodes and their corresponding variable nodes.
 * @param formulaIndex - The index of the formula to process edges for
 * @param labelNodes - Array of all label nodes
 * @param variableNodes - Array of all variable nodes
 * @param formulaNodes - Array of all formula nodes
 * @param shouldLabelBeVisible - Predicate function to check if a label should be visible
 * @param createdEdgeIds - Set to track which edge IDs have been created
 * @returns Array of edges for this specific formula
 */
export function computeEdgesForFormula(
  formulaIndex: string,
  labelNodes: Node[],
  variableNodes: Node[],
  formulaNodes: Node[],
  shouldLabelBeVisible: (varId: string) => boolean,
  createdEdgeIds: Set<string>
): Edge[] {
  const edges: Edge[] = [];

  // Filter label nodes for this specific formula
  const formulaLabelNodes = labelNodes.filter((node) => {
    const labelIdParts = node.id.split("-");
    return labelIdParts.length >= 3 && labelIdParts[1] === formulaIndex;
  });

  formulaLabelNodes.forEach((labelNode) => {
    const labelNodeData = labelNode.data as { varId?: string };
    const varId = labelNodeData?.varId;
    if (!varId || !shouldLabelBeVisible(varId)) return;

    const labelIdParts = labelNode.id.split("-");
    if (labelIdParts.length < 3) return;

    const cssId = labelIdParts[2];

    // Find matching variable nodes for this formula
    const matchingVariableNodes = variableNodes.filter((node) => {
      const varIdParts = node.id.split("-");
      return (
        varIdParts.length >= 4 &&
        varIdParts[0] === "variable" &&
        varIdParts[1] === formulaIndex &&
        varIdParts[2] === cssId
      );
    });

    const variableNode = matchingVariableNodes[0];
    if (!variableNode) return;

    // Calculate absolute positions for comparison
    const labelAbsoluteY = labelNode.position.y;
    let variableAbsoluteY = variableNode.position.y;
    if (variableNode.parentId) {
      const parentFormulaNode = formulaNodes.find(
        (node) => node.id === variableNode.parentId
      );
      if (parentFormulaNode) {
        variableAbsoluteY =
          parentFormulaNode.position.y + variableNode.position.y;
      }
    }

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
        stroke: "#94a3b8",
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

  const variableNodes = currentNodes.filter((node) =>
    node.id.startsWith("variable-")
  );
  const labelNodes = currentNodes.filter((node) =>
    node.id.startsWith("label-")
  );
  const formulaNodes = currentNodes.filter((node) =>
    node.id.startsWith("formula-")
  );

  // Extract unique formula indices from label nodes
  const formulaIndices = new Set<string>();
  labelNodes.forEach((labelNode) => {
    const labelIdParts = labelNode.id.split("-");
    if (labelIdParts.length >= 3) {
      formulaIndices.add(labelIdParts[1]);
    }
  });

  // Process edges for each formula
  formulaIndices.forEach((formulaIndex) => {
    const formulaEdges = computeEdgesForFormula(
      formulaIndex,
      labelNodes,
      variableNodes,
      formulaNodes,
      shouldLabelBeVisible,
      createdEdgeIds
    );
    edges.push(...formulaEdges);
  });

  return edges;
}
