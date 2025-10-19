import { Node } from "@xyflow/react";
import { computationStore } from "../../store/computation";

interface BaseVariableNodesParams {
  getNodes: () => Node[];
  getViewport: () => { zoom: number; x: number; y: number };
  nodesInitialized: boolean;
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  getPosAndDim: (
    varRect: DOMRect,
    formulaRect: DOMRect,
    viewport: { zoom: number }
  ) => {
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
  };
  showVariableBorders: boolean;
  variableNodesAddedRef: React.MutableRefObject<boolean>;
}

interface AddVariableNodesParams extends BaseVariableNodesParams {
  addLabelNodes: () => void;
  addViewNodes: () => void;
}

type UpdateVariableNodesParams = BaseVariableNodesParams;

/**
 * Function to add variable nodes as subnodes using React Flow's measurement system
 */
export const addVariableNodes = ({
  getNodes,
  getViewport,
  nodesInitialized,
  setNodes,
  getPosAndDim,
  showVariableBorders,
  addLabelNodes,
  addViewNodes,
  variableNodesAddedRef,
}: AddVariableNodesParams) => {
  // Use requestAnimationFrame to ensure we're in a clean render cycle
  requestAnimationFrame(() => {
    const checkMathJaxAndProceed = () => {
      // Get current values inside the function to avoid stale closures
      const currentNodes = getNodes();
      const viewport = getViewport();

      // Only proceed if nodes are initialized and measured
      if (!nodesInitialized) return;

      const variableNodes: Node[] = [];

      // Find all formula nodes in the DOM
      const formulaElements = document.querySelectorAll(".formula-node");

      // PHASE 1: Create only variable nodes first
      formulaElements.forEach((formulaElement, formulaIndex) => {
        // Get the corresponding formula node ID and its React Flow node data
        const formulaNodeId = `formula-${formulaIndex}`;
        const formulaNode = currentNodes.find(
          (node) => node.id === formulaNodeId
        );

        // Skip if we can't find the React Flow node or it's not measured yet
        if (!formulaNode || !formulaNode.measured) return;

        // Find variable elements within this formula
        const variableElements = formulaElement.querySelectorAll(
          '[class*="interactive-var-"]'
        );

        variableElements.forEach(
          (varElement: Element, elementIndex: number) => {
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

            const nodeId = `variable-${formulaIndex}-${cssId}-${elementIndex}`;

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
                showBorders: showVariableBorders,
              },
              draggable: false, // Subnodes typically aren't independently draggable
              selectable: true,
            });
          }
        );
      });

      // Add variable nodes to existing nodes first
      if (variableNodes.length > 0) {
        setNodes((currentNodes) => {
          // Remove existing variable nodes and add new variable nodes
          const nonVariableNodes = currentNodes.filter(
            (node) => !node.id.startsWith("variable-")
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

/**
 * Function to update variable nodes or add new ones (hybrid approach)
 */
export const updateVariableNodes = ({
  getNodes,
  getViewport,
  nodesInitialized,
  setNodes,
  getPosAndDim,
  showVariableBorders,
  variableNodesAddedRef,
}: UpdateVariableNodesParams) => {
  // Use requestAnimationFrame for cleaner timing
  requestAnimationFrame(() => {
    const processNodes = () => {
      const currentNodes = getNodes();
      const viewport = getViewport();

      if (!nodesInitialized) return;

      // Create a map of existing variable node IDs for quick lookup
      const variableNodes = new Map<string, Node>();
      currentNodes.forEach((node) => {
        if (node.id.startsWith("variable-")) {
          variableNodes.set(node.id, node);
        }
      });

      const updatedNodes: Node[] = [];
      const newNodes: Node[] = [];
      const foundNodeIds = new Set<string>();

      // Find all formula nodes in the DOM
      const formulaElements = document.querySelectorAll(".formula-node");

      formulaElements.forEach((formulaElement, formulaIndex) => {
        const formulaNodeId = `formula-${formulaIndex}`;
        const formulaNode = currentNodes.find(
          (node) => node.id === formulaNodeId
        );

        if (!formulaNode || !formulaNode.measured) return;

        // Find variable elements within this formula
        const variableElements = formulaElement.querySelectorAll(
          '[class*="interactive-var-"]'
        );

        variableElements.forEach(
          (varElement: Element, elementIndex: number) => {
            const htmlVarElement = varElement as HTMLElement;
            const cssId = htmlVarElement.id;
            if (!cssId) return;

            if (!computationStore.variables.has(cssId)) return;

            const nodeId = `variable-${formulaIndex}-${cssId}-${elementIndex}`;
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
                parentId: formulaNodeId,
                extent: "parent",
                data: {
                  varId: cssId,
                  symbol: cssId,
                  width: dimensions.width,
                  height: dimensions.height,
                  labelPlacement: "below", // Default, will be updated when labels are recalculated
                  showBorders: showVariableBorders,
                },
                draggable: false,
                selectable: true,
              });
            }
          }
        );
      });

      // Check if there are actually any changes before updating
      const hasChanges =
        updatedNodes.length > 0 ||
        newNodes.length > 0 ||
        currentNodes.some(
          (node) =>
            node.id.startsWith("variable-") && !foundNodeIds.has(node.id)
        );

      // Only update nodes if there are actual changes
      if (hasChanges) {
        setNodes((currentNodes) => {
          // Keep non-variable nodes
          const nonVariableNodes = currentNodes.filter(
            (node) => !node.id.startsWith("variable-")
          );

          // Keep variable nodes that are still found in the DOM
          const keptVariableNodes = currentNodes.filter(
            (node) =>
              node.id.startsWith("variable-") && foundNodeIds.has(node.id)
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
