import { Node } from "@xyflow/react";

import { ComputationStore } from "../../store/computation";
import { ExecutionStore } from "../../store/execution";
import { VAR_SELECTORS } from "../css-classes";
import {
  NODE_TYPES,
  findFormulaNodeById,
  forEachFormulaNode,
  getFormulaElementFromContainer,
  getVariableNodes,
} from "./node-helpers";

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
  viewport: { zoom: number }
): LabelPlacement => {
  // Since labels are hidden initially and repositioned using measured dimensions,
  // we just need simple placeholder values
  const placeholderHeight = 24;

  // Define spacing constants (adjusted for zoom)
  const spacing = {
    vertical: 10 / viewport.zoom, // Space between formula and labels
    labelSpacing: 12 / viewport.zoom, // Space between multiple labels
  };

  // varNodePos is already relative to the formula node (from HTML element positioning)
  const formulaNodePos = formulaNode.position;

  // For initial hidden render, just position at variable center
  // Actual positioning will be calculated using measured dimensions
  const absoluteVariableX = formulaNodePos.x + varNodePos.x;
  const variableCenterX = absoluteVariableX + varNodeDim.width / 2;
  const labelX = variableCenterX; // Simple center position for placeholder

  // Determine optimal placement based on variable position within formula
  // Compare variable's vertical midpoint with formula's vertical midpoint
  const variableMidpointY = varNodePos.y + varNodeDim.height / 2; // Relative to formula
  const formulaMidpointY = formulaNodeDim.height / 2; // Relative to formula

  // If variable is in upper half of formula, prefer placing label above
  // If variable is in lower half of formula, prefer placing label below
  const variableInUpperHalf = variableMidpointY < formulaMidpointY;

  const abovePriority = variableInUpperHalf ? 1 : 2;
  const belowPriority = variableInUpperHalf ? 2 : 1;

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
      priority: belowPriority,
    },
    {
      type: "above",
      position: {
        x: labelX,
        y: formulaNodePos.y - placeholderHeight - spacing.vertical,
      },
      priority: abovePriority,
    },
  ];

  // Use the smart placement based on variable position
  // No collision detection with arbitrary sizes - we rely on:
  // 1. Smart placement (above if variable in upper half, below if in lower half)
  // 2. Measured dimensions and adjustLabelPositions for final positioning
  const selectedPlacement = placements.sort(
    (a, b) => a.priority - b.priority
  )[0];

  return {
    x: selectedPlacement.position.x,
    y: selectedPlacement.position.y,
    placement: selectedPlacement.type,
  };
};

export interface AddLabelNodesParams {
  getNodes: () => Node[];
  getViewport: () => { zoom: number; x: number; y: number };
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  computationStore: ComputationStore;
  executionStore: ExecutionStore;
}

export interface AdjustLabelPositionsParams {
  getNodes: () => Node[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  manuallyPositionedLabels: Set<string>;
}

export interface UpdateLabelNodesParams {
  getNodes: () => Node[];
  getViewport: () => { zoom: number; x: number; y: number };
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  formulaId: string;
  containerElement?: Element | null;
  computationStore: ComputationStore;
  executionStore: ExecutionStore;
}

/**
 * Apply labelPlacement updates to variable nodes
 * @param nodes - Array of nodes to update
 * @param updates - Array of updates with nodeId and labelPlacement
 * @returns Updated nodes array
 */
export const updateLabelPlacement = (
  nodes: Node[],
  updates: Array<{ nodeId: string; labelPlacement: "below" | "above" }>
): Node[] => {
  return nodes.map((node) => {
    const update = updates.find((u) => u.nodeId === node.id);
    if (update) {
      return {
        ...node,
        data: {
          ...node.data,
          labelPlacement: update.labelPlacement,
        },
      };
    }
    return node;
  });
};

/**
 * Process variable elements for a single formula and create label nodes
 * @param formulaElement - The DOM element containing the formula
 * @param formulaNode - The React Flow formula node
 * @param id - The ID of the formula (e.g., "kinetic-energy")
 * @param currentNodes - Array of all current React Flow nodes
 * @param viewport - The React Flow viewport
 * @returns Object containing arrays of label nodes and variable node updates
 */
export const processVariableElementsForLabels = (
  formulaElement: Element,
  formulaNode: Node,
  id: string,
  currentNodes: Node[],
  viewport: { zoom: number; x: number; y: number },
  computationStore: ComputationStore,
  executionStore: ExecutionStore
): {
  labelNodes: Node[];
  variableNodeUpdates: Array<{
    nodeId: string;
    labelPlacement: "below" | "above";
  }>;
} => {
  const labelNodes: Node[] = [];
  const variableNodeUpdates: Array<{
    nodeId: string;
    labelPlacement: "below" | "above";
  }> = [];
  // Track which variables already have labels to prevent duplicates
  const processedVariables = new Set<string>();
  // Find variable elements within this formula
  const variableElements = formulaElement.querySelectorAll(VAR_SELECTORS.ANY);
  variableElements.forEach((varElement: Element) => {
    const htmlVarElement = varElement as HTMLElement;
    const cssId = htmlVarElement.id;
    if (!cssId) return;
    // Skip if we've already processed this variable
    if (processedVariables.has(cssId)) return;
    processedVariables.add(cssId);
    const variable = computationStore.variables.get(cssId);
    // Don't create label node if labelDisplay is "none"
    if (variable?.labelDisplay === "none") return;
    // Only create label node if there's either a label OR a value
    const hasValue =
      variable?.value !== undefined &&
      variable?.value !== null &&
      (typeof variable.value === "number" ? !isNaN(variable.value) : true);
    const hasName = variable?.name;
    // For labelDisplay === "value", we must have a valid value to show
    // For other displays, we can show just the name
    if (variable?.labelDisplay === "value" && !hasValue) return;
    if (!hasValue && !hasName) return;
    // Check if this label should be visible using the same logic as LabelNode component
    const isVariableActive = executionStore.activeVariables.has(cssId);
    // If in step mode and variable is not active, skip creating this label
    if (computationStore.isStepMode() && !isVariableActive) {
      return;
    }
    // Get the corresponding variable node to get its actual position
    // Find the first variable node for this cssId since we may have multiple instances
    // Use node properties instead of ID parsing to handle hyphens in cssId
    const variableNode = currentNodes.find((node) => {
      return node.parentId === formulaNode.id && node.data.varId === cssId;
    });
    if (!variableNode) return;
    // Use the variable node position directly (already in React Flow coordinates)
    // This avoids coordinate conversion issues and should be accurate
    const htmlElementPosition = variableNode.position;
    const htmlElementDimensions = {
      width: (variableNode.data.width as number) || 0,
      height: (variableNode.data.height as number) || 0,
    };
    const labelPos = getLabelNodePos(
      htmlElementPosition,
      htmlElementDimensions,
      formulaNode,
      {
        width: formulaNode.measured?.width || formulaNode.width || 400,
        height: formulaNode.measured?.height || formulaNode.height || 200,
      },
      viewport
    );
    // Create the label node - initially nearly transparent until positioned correctly
    // Use 0.01 instead of 0 so React Flow measures it properly
    // Make label a child of the formula node so it automatically moves with the formula
    // Convert absolute position to relative position (relative to formula node)
    const relativePosition = {
      x: labelPos.x - formulaNode.position.x,
      y: labelPos.y - formulaNode.position.y,
    };
    labelNodes.push({
      id: `label-${id}-${cssId}`,
      type: "label",
      position: relativePosition,
      parentId: formulaNode.id, // Make this a child of the formula node
      data: {
        varId: cssId,
        id: id,
        placement: labelPos.placement,
      },
      draggable: true,
      selectable: true,
      style: {
        opacity: 0.01, // Nearly invisible but measurable
        pointerEvents: "none" as const, // Disable interactions while hidden
      },
    });
    // Track variable node updates
    variableNodeUpdates.push({
      nodeId: variableNode.id,
      labelPlacement: labelPos.placement,
    });
  });
  return { labelNodes, variableNodeUpdates };
};

/**
 * Update label nodes for a single formula.
 * This is used by FormulaComponent when activeVariables change.
 */
export const updateLabelNodes = ({
  getNodes,
  getViewport,
  setNodes,
  formulaId,
  containerElement,
  computationStore,
  executionStore,
}: UpdateLabelNodesParams): void => {
  const currentNodes = getNodes();
  const viewport = getViewport();
  const formulaElement = getFormulaElementFromContainer(
    containerElement,
    currentNodes,
    formulaId
  );
  if (!formulaElement) return;
  const formulaNode = findFormulaNodeById(currentNodes, formulaId);
  if (!formulaNode || !formulaNode.measured) return;
  // Get existing variable nodes for this formula
  const existingVariableNodes = currentNodes.filter(
    (node) =>
      node.type === NODE_TYPES.VARIABLE && node.parentId === formulaNode.id
  );

  if (existingVariableNodes.length === 0) return;
  setNodes((currentNodes) => {
    // Remove existing label nodes only
    const nonLabelNodes = currentNodes.filter(
      (node) => node.type !== NODE_TYPES.LABEL
    );
    // Use helper to create label nodes based on current activeVariables
    const { labelNodes, variableNodeUpdates } =
      processVariableElementsForLabels(
        formulaElement!,
        formulaNode,
        formulaId,
        nonLabelNodes,
        viewport,
        computationStore,
        executionStore
      );
    // Apply variable node updates (labelPlacement)
    const updatedNodes = updateLabelPlacement(
      nonLabelNodes,
      variableNodeUpdates
    );
    return [...updatedNodes, ...labelNodes];
  });
};

/**
 * Add label nodes to the canvas after variable nodes are positioned
 */
export const addLabelNodes = ({
  getNodes,
  getViewport,
  setNodes,
  computationStore,
  executionStore,
}: AddLabelNodesParams): void => {
  const currentNodes = getNodes();
  const viewport = getViewport();
  const labelNodes: Node[] = [];
  const variableNodeUpdates: Array<{
    nodeId: string;
    labelPlacement: "below" | "above";
  }> = [];

  forEachFormulaNode(currentNodes, (formulaNode, formulaElement, id) => {
    const { labelNodes: formulaLabels, variableNodeUpdates: formulaUpdates } =
      processVariableElementsForLabels(
        formulaElement,
        formulaNode,
        id,
        currentNodes,
        viewport,
        computationStore,
        executionStore
      );
    labelNodes.push(...formulaLabels);
    variableNodeUpdates.push(...formulaUpdates);
  });

  // Add label nodes and update variable nodes with correct placement info
  if (labelNodes.length > 0 || variableNodeUpdates.length > 0) {
    setNodes((currentNodes) => {
      const updatedNodes = updateLabelPlacement(
        currentNodes,
        variableNodeUpdates
      );
      return [...updatedNodes, ...labelNodes];
    });
  }
};

/**
 * Adjust label positions after they're rendered and measured
 * Centers labels horizontally above their corresponding variables
 */
export const adjustLabelPositions = ({
  getNodes,
  setNodes,
  manuallyPositionedLabels,
}: AdjustLabelPositionsParams): void => {
  const currentNodes = getNodes();

  // Track positioned labels for horizontal collision detection (using actual measured dimensions)
  // Group by parent formula node since positions are relative to parent
  const positionedLabels: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    placement: "above" | "below";
    parentId: string; // Track which formula node this label belongs to
  }> = [];

  const updatedNodes = currentNodes.map((node) => {
    if (node.type !== NODE_TYPES.LABEL || !node.measured) {
      return node;
    }

    // Skip labels that have been manually positioned by the user
    if (manuallyPositionedLabels.has(node.id)) {
      // Still track manually positioned labels for collision detection
      if (node.measured.width && node.measured.height && node.parentId) {
        positionedLabels.push({
          x: node.position.x,
          y: node.position.y,
          width: node.measured.width,
          height: node.measured.height,
          placement: (node.data.placement as "above" | "below") || "below",
          parentId: node.parentId, // Track parent for relative coordinate comparison
        });
      }
      return node;
    }

    // Extract varId and id from label node data instead of parsing ID
    // This handles cssId with hyphens correctly
    const cssId = node.data.varId;
    const id = node.data.id;
    if (!cssId || !id || typeof id !== "string") return node;
    // Find the formula node first
    const formulaNode = findFormulaNodeById(currentNodes, id);
    if (!formulaNode) return node;
    // Find the corresponding variable node using node properties
    const variableNodes = getVariableNodes(currentNodes);
    const variableNode = variableNodes.find((vNode) => {
      return (
        vNode.data.varId === cssId &&
        // Check if variable belongs to same formula by checking parent
        vNode.parentId === formulaNode.id
      );
    });

    if (!variableNode) return node;
    // Only proceed if the variable node is also measured to ensure coordinate consistency
    if (!variableNode.measured) return node;
    // Calculate the perfect centered position using actual measured width
    const actualLabelWidth = node.measured.width || node.width || 40;
    // Since labels are now children of formula nodes (parentId set),
    // all positions are relative to the formula node, not absolute
    // Variable nodes are also children, so their positions are already relative
    let variableCenterX: number;
    if (variableNode.measured && variableNode.measured.width) {
      // Variable node is measured - use its center in relative coordinates
      variableCenterX =
        variableNode.position.x + variableNode.measured.width / 2;
    } else {
      // Fallback to data dimensions if not yet measured
      const variableDimensions = {
        width: (variableNode.data.width as number) || 0,
        height: (variableNode.data.height as number) || 0,
      };
      variableCenterX = variableNode.position.x + variableDimensions.width / 2;
    }

    let finalLabelX = variableCenterX - actualLabelWidth / 2;
    // Calculate Y position based on placement and actual measured height
    // All relative to formula node (0,0 is formula node's top-left)
    const actualLabelHeight = node.measured.height || node.height || 24;
    const placement = node.data.placement as "below" | "above";
    const spacing = { vertical: 10, horizontal: 4 }; // Consistent spacing from formula and between labels
    const formulaNodeHeight =
      formulaNode.measured?.height || formulaNode.height || 200;

    let adjustedY: number;
    if (placement === "above") {
      // Position above: negative Y (above formula's top edge)
      adjustedY = -actualLabelHeight - spacing.vertical;
    } else {
      // Position below: formulaHeight + spacing
      adjustedY = formulaNodeHeight + spacing.vertical;
    }

    // Check for horizontal collision with already positioned labels at same placement
    // Only compare labels that share the same parent (same formula node)
    const hasHorizontalCollision = (testX: number): boolean => {
      return positionedLabels.some((positioned) => {
        // Only check labels that belong to the same formula node (same coordinate system)
        if (positioned.parentId !== formulaNode.id) return false;
        // Only check labels at the same placement (above/below)
        if (positioned.placement !== placement) return false;
        // Check if Y ranges overlap (labels at similar vertical positions)
        const yOverlap = !(
          adjustedY + actualLabelHeight < positioned.y ||
          adjustedY > positioned.y + positioned.height
        );

        if (!yOverlap) return false;
        // Check if X ranges overlap
        const xOverlap = !(
          testX + actualLabelWidth < positioned.x ||
          testX > positioned.x + positioned.width
        );

        return xOverlap;
      });
    };

    // Adjust X position if collision detected
    if (hasHorizontalCollision(finalLabelX)) {
      // Try shifting right first
      let shiftedX = finalLabelX + spacing.horizontal;
      let attempts = 0;
      const maxAttempts = 10;

      while (hasHorizontalCollision(shiftedX) && attempts < maxAttempts) {
        shiftedX += actualLabelWidth / 2 + spacing.horizontal;
        attempts++;
      }

      // If right shift worked, use it
      if (!hasHorizontalCollision(shiftedX)) {
        finalLabelX = shiftedX;
      } else {
        // Try shifting left instead
        shiftedX = finalLabelX - spacing.horizontal;
        attempts = 0;

        while (hasHorizontalCollision(shiftedX) && attempts < maxAttempts) {
          shiftedX -= actualLabelWidth / 2 + spacing.horizontal;
          attempts++;
        }

        if (!hasHorizontalCollision(shiftedX)) {
          finalLabelX = shiftedX;
        }
        // If both fail, keep centered position (collision unavoidable)
      }
    }

    // Track this label for subsequent collision detection
    positionedLabels.push({
      x: finalLabelX,
      y: adjustedY,
      width: actualLabelWidth,
      height: actualLabelHeight,
      placement: placement,
      parentId: formulaNode.id, // Track parent for coordinate system comparison
    });

    // Fix X alignment and Y position, and make label visible
    return {
      ...node,
      position: {
        x: finalLabelX,
        y: adjustedY,
      },
      style: {
        ...node.style,
        opacity: 1, // Make visible
        pointerEvents: "auto" as const, // Re-enable interactions
      },
    };
  });

  // Only update if there are actual changes (position or visibility)
  const hasChanges = updatedNodes.some((node, index) => {
    const original = currentNodes[index];
    const opacityChanged =
      original.style?.opacity !== node.style?.opacity &&
      (original.style?.opacity === 0.01 || original.style?.opacity === 0); // Opacity going from hidden to visible
    return (
      original.position.x !== node.position.x ||
      original.position.y !== node.position.y ||
      opacityChanged
    );
  });

  if (hasChanges) {
    setNodes(updatedNodes);
  }
};
