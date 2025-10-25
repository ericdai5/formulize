import { Node, useReactFlow } from "@xyflow/react";

import { computationStore } from "../../store/computation";
import { NODE_TYPES, getFormulaNodes, getVariableNodes } from "./node-helpers";

/*********** Helper Functions for Variable Nodes ***********/

/**
 * Utility function for calculating relative position and dimensions
 * @param varRect - The DOMRect of the variable element
 * @param formulaRect - The DOMRect of the formula element
 * @param viewport - The viewport of the React Flow instance
 * @returns The relative position and dimensions of the variable element, adjusted for zoom level
 */
export const getPosAndDim = (
  varRect: DOMRect,
  formulaRect: DOMRect,
  viewport: { zoom: number }
) => {
  const position = {
    x: (varRect.left - formulaRect.left) / viewport.zoom,
    y: (varRect.top - formulaRect.top) / viewport.zoom,
  };
  const dimensions = {
    width: varRect.width / viewport.zoom,
    height: varRect.height / viewport.zoom,
  };
  return { position, dimensions };
};

/**
 * Process variable elements within a formula and update/create variable nodes
 * @param formulaElement - The DOM element containing the formula
 * @param formulaNode - The React Flow formula node
 * @param index - The index of the formula
 * @param viewport - The React Flow viewport
 * @param variableNodes - Map of existing variable nodes
 * @param foundNodeIds - Set to track which node IDs were found
 * @returns Object containing arrays of updated and new nodes
 */
export const updateVariableNodesForFormula = (
  formulaElement: Element,
  formulaNode: Node,
  formulaId: string,
  viewport: { zoom: number },
  variableNodes: Map<string, Node>,
  foundNodeIds: Set<string>
): { updatedNodes: Node[]; newNodes: Node[] } => {
  const updatedNodes: Node[] = [];
  const newNodes: Node[] = [];

  // Find variable elements within this formula
  const variableElements = formulaElement.querySelectorAll(
    '[class*="interactive-var-"]'
  );

  variableElements.forEach((varElement: Element, elementIndex: number) => {
    const htmlVarElement = varElement as HTMLElement;
    const cssId = htmlVarElement.id;
    if (!cssId) return;

    if (!computationStore.variables.has(cssId)) return;

    const nodeId = `variable-${formulaId}-${cssId}-${elementIndex}`;
    foundNodeIds.add(nodeId);

    // Calculate new position and dimensions
    const varRect = htmlVarElement.getBoundingClientRect();
    const formulaRect = formulaElement.getBoundingClientRect();
    const { position, dimensions } = getPosAndDim(
      varRect,
      formulaRect,
      viewport
    );

    const variableNode = variableNodes.get(nodeId);

    if (variableNode) {
      // Check if position or dimensions actually changed
      const positionChanged =
        variableNode.position.x !== position.x ||
        variableNode.position.y !== position.y;
      const dimensionsChanged =
        variableNode.data.width !== dimensions.width ||
        variableNode.data.height !== dimensions.height;
      // Only add to updated nodes if something actually changed
      if (positionChanged || dimensionsChanged) {
        updatedNodes.push({
          ...variableNode,
          position,
          data: {
            ...variableNode.data,
            width: dimensions.width,
            height: dimensions.height,
          },
        });
      }
    } else {
      // Create new node
      newNodes.push({
        id: nodeId,
        type: "variable",
        position,
        parentId: formulaNode.id,
        extent: "parent",
        data: {
          varId: cssId,
          symbol: cssId,
          width: dimensions.width,
          height: dimensions.height,
          labelPlacement: "below", // Default, will be updated when labels are recalculated
          showBorders: computationStore.showVariableBorders,
        },
        draggable: false,
        selectable: true,
      });
    }
  });

  return { updatedNodes, newNodes };
};

/**
 * Create variable nodes from DOM elements for a single formula
 * @param formulaElement - The DOM element containing the formula
 * @param formulaNode - The React Flow formula node
 * @param formulaId - The ID of the formula (e.g., "kinetic-energy" or index "0")
 * @param viewport - The React Flow viewport
 * @returns Array of variable nodes
 */
export const createVariableNodesFromFormula = (
  formulaElement: Element,
  formulaNode: Node,
  formulaId: string,
  viewport: { zoom: number }
): Node[] => {
  const variableNodes: Node[] = [];
  const formulaNodeId = formulaNode.id;

  // Find variable elements within this formula
  const variableElements = formulaElement.querySelectorAll(
    '[class*="interactive-var-"]'
  );

  variableElements.forEach((varElement: Element, elementIndex: number) => {
    const htmlVarElement = varElement as HTMLElement;
    const cssId = htmlVarElement.id;
    if (!cssId) return;

    // Verify this variable exists in the computation store
    if (!computationStore.variables.has(cssId)) return;

    // Calculate position relative to the formula node, accounting for React Flow's zoom
    const varRect = htmlVarElement.getBoundingClientRect();
    const formulaRect = formulaElement.getBoundingClientRect();
    const { position, dimensions } = getPosAndDim(
      varRect,
      formulaRect,
      viewport
    );

    const nodeId = `variable-${formulaId}-${cssId}-${elementIndex}`;

    // Create only the variable node - no labels yet
    variableNodes.push({
      id: nodeId,
      type: "variable",
      position,
      parentId: formulaNodeId, // Make this a subnode of the formula
      extent: "parent", // Constrain to parent bounds
      data: {
        varId: cssId,
        symbol: cssId,
        // VariableNode will get all variable data reactively from the store
        width: dimensions.width,
        height: dimensions.height,
        labelPlacement: "below", // Default placement, will be updated in phase 2
        showBorders: computationStore.showVariableBorders,
      },
      draggable: false, // Subnodes typically aren't independently draggable
      selectable: true,
    });
  });

  return variableNodes;
};

interface BaseVariableNodesParams {
  nodesInitialized: boolean;
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  variableNodesAddedRef: React.MutableRefObject<boolean>;
}

interface AddVariableNodesParams extends BaseVariableNodesParams {
  addLabelNodes: () => void;
  addViewNodes: () => void;
}

type UpdateVariableNodesParams = BaseVariableNodesParams;

/**
 * Hook to get a function that adds variable nodes as subnodes using React Flow's measurement system
 */
export const useAddVariableNodes = ({
  nodesInitialized,
  setNodes,
  addLabelNodes,
  addViewNodes,
  variableNodesAddedRef,
}: AddVariableNodesParams) => {
  const { getNodes, getViewport } = useReactFlow();

  return () => {
    // Use requestAnimationFrame to ensure we're in a clean render cycle
    requestAnimationFrame(() => {
      const checkMathJaxAndProceed = () => {
        // Get current values inside the function to avoid stale closures
        const currentNodes = getNodes();
        const viewport = getViewport();

        // Only proceed if nodes are initialized and measured
        if (!nodesInitialized) return;

        const variableNodes: Node[] = [];

        // PHASE 1: Create only variable nodes first
        // Iterate through formula nodes instead of DOM elements
        const formulaNodes = getFormulaNodes(currentNodes);
        formulaNodes.forEach((formulaNode) => {
          // Skip if the React Flow node is not measured yet
          if (!formulaNode.measured) return;

          // Extract formulaId from node data - this is required
          const formulaId = formulaNode.data.formulaId;
          if (!formulaId || typeof formulaId !== "string") {
            console.error(
              `Formula node ${formulaNode.id} missing required formulaId`
            );
            return;
          }

          // Find the corresponding DOM element for this formula node
          const formulaElement = document.querySelector(
            `[data-id="${formulaNode.id}"] .formula-node`
          );
          if (!formulaElement) return;

          // Use helper to create variable nodes for this formula
          const nodesForFormula = createVariableNodesFromFormula(
            formulaElement,
            formulaNode,
            formulaId,
            viewport
          );
          variableNodes.push(...nodesForFormula);
        });

        // Add variable nodes to existing nodes first
        if (variableNodes.length > 0) {
          setNodes((currentNodes) => {
            // Remove existing variable nodes and add new variable nodes
            const nonVariableNodes = currentNodes.filter(
              (node) => node.type !== NODE_TYPES.VARIABLE
            );
            return [...nonVariableNodes, ...variableNodes];
          });

          // Mark that variable nodes have been added
          variableNodesAddedRef.current = true;

          // Add label nodes and view nodes after variable nodes are ready
          setTimeout(() => {
            addLabelNodes();
            addViewNodes();
          }, 100);
        }
      };

      // Check if MathJax is ready, but don't wait for promises
      if (
        window.MathJax &&
        window.MathJax.startup &&
        window.MathJax.startup.document
      ) {
        // MathJax is ready, proceed immediately
        checkMathJaxAndProceed();
      } else {
        // Fall back to setTimeout if MathJax isn't ready
        setTimeout(checkMathJaxAndProceed, 200);
      }
    });
  };
};

/**
 * Hook to get a function that updates variable nodes or adds new ones (hybrid approach)
 */
export const useUpdateVariableNodes = ({
  nodesInitialized,
  setNodes,
  variableNodesAddedRef,
}: UpdateVariableNodesParams) => {
  const { getNodes, getViewport } = useReactFlow();

  return () => {
    // Use requestAnimationFrame for cleaner timing
    requestAnimationFrame(() => {
      const processNodes = () => {
        const currentNodes = getNodes();
        const viewport = getViewport();

        if (!nodesInitialized) return;

        // Create a map of existing variable node IDs for quick lookup
        const variableNodesArray = getVariableNodes(currentNodes);
        const variableNodes = new Map<string, Node>();
        variableNodesArray.forEach((node) => {
          variableNodes.set(node.id, node);
        });

        const updatedNodes: Node[] = [];
        const newNodes: Node[] = [];
        const foundNodeIds = new Set<string>();

        // Iterate through formula nodes instead of DOM elements
        const formulaNodesArray = getFormulaNodes(currentNodes);
        formulaNodesArray.forEach((formulaNode) => {
          if (!formulaNode.measured) return;

          // Extract formulaId from node data - this is required
          const formulaId = formulaNode.data.formulaId;
          if (!formulaId || typeof formulaId !== "string") {
            console.error(
              `Formula node ${formulaNode.id} missing required formulaId`
            );
            return;
          }

          // Find the corresponding DOM element for this formula node
          const formulaElement = document.querySelector(
            `[data-id="${formulaNode.id}"] .formula-node`
          );
          if (!formulaElement) return;

          // Process variable elements for this formula using helper function
          const { updatedNodes: formulaUpdated, newNodes: formulaNew } =
            updateVariableNodesForFormula(
              formulaElement,
              formulaNode,
              formulaId,
              viewport,
              variableNodes,
              foundNodeIds
            );

          updatedNodes.push(...formulaUpdated);
          newNodes.push(...formulaNew);
        });

        // Check if there are actually any changes before updating
        const hasChanges =
          updatedNodes.length > 0 ||
          newNodes.length > 0 ||
          variableNodesArray.some((node) => !foundNodeIds.has(node.id));

        // Only update nodes if there are actual changes
        if (hasChanges) {
          setNodes((currentNodes) => {
            // Keep non-variable nodes
            const nonVariableNodes = currentNodes.filter(
              (node) => node.type !== NODE_TYPES.VARIABLE
            );

            // Keep variable nodes that are still found in the DOM
            const variableNodesInCurrentNodes = getVariableNodes(currentNodes);
            const keptVariableNodes = variableNodesInCurrentNodes.filter(
              (node) => foundNodeIds.has(node.id)
            );

            // Apply updates to kept variable nodes
            const finalVariableNodes = keptVariableNodes.map((node) => {
              const update = updatedNodes.find((u) => u.id === node.id);
              return update || node;
            });

            // Combine all nodes
            const finalNodeList = [
              ...nonVariableNodes,
              ...finalVariableNodes,
              ...newNodes,
            ];

            return finalNodeList;
          });
        }

        // Mark that variable nodes have been added if we have any
        if (foundNodeIds.size > 0) {
          variableNodesAddedRef.current = true;
        }
      };

      // Check if MathJax is ready, but don't wait for promises
      if (
        window.MathJax &&
        window.MathJax.startup &&
        window.MathJax.startup.document
      ) {
        // MathJax is ready, proceed immediately
        processNodes();
      } else {
        // Fall back to setTimeout if MathJax isn't ready
        setTimeout(processNodes, 200);
      }
    });
  };
};
