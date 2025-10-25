import { Node } from "@xyflow/react";

/**
 * Find a formula node by its index in the current nodes array
 * @param currentNodes - Array of all React Flow nodes
 * @param formulaIndex - The index of the formula to find (string or number)
 * @returns The formula node if found, undefined otherwise
 */
export const findFormulaNodeByIndex = (
  currentNodes: Node[],
  formulaIndex: string | number
): Node | undefined => {
  const formulaNodeId = `formula-${formulaIndex}`;
  return currentNodes.find((node) => node.id === formulaNodeId);
};
