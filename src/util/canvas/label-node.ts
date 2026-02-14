import { Node } from "@xyflow/react";

import { VAR_SELECTORS } from "../../internal/css-classes";
import { ComputationStore } from "../../store/computation";
import { ICollectedStep } from "../../types/step";
import {
  NODE_TYPES,
  findFormulaNodeById,
  forEachFormulaNode,
  getFormulaElementFromContainer,
  getVariableNodes,
} from "./node-helpers";

// Common type for label placement direction
type PlacementDirection = "below" | "above";

// Enhanced label positioning system
export interface LabelPlacement {
  x: number;
  y: number;
  placement: PlacementDirection;
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
  viewport: { zoom: number },
  forcePlacement?: "above" | "below"
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

  // If forcePlacement is provided, select that placement
  if (forcePlacement) {
    const forced = placements.find((p) => p.type === forcePlacement);
    if (forced) {
      return {
        x: forced.position.x,
        y: forced.position.y,
        placement: forced.type,
      };
    }
  }

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
}

export interface AdjustLabelPositionsParams {
  getNodes: () => Node[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
}

export interface UpdateLabelNodesParams {
  getNodes: () => Node[];
  getViewport: () => { zoom: number; x: number; y: number };
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  formulaId: string;
  containerElement?: Element | null;
  computationStore: ComputationStore;
}

/**
 * Apply labelPlacement updates to variable nodes
 * @param nodes - Array of nodes to update
 * @param updates - Array of updates with nodeId and labelPlacement
 * @returns Updated nodes array
 */
export const updateLabelPlacement = (
  nodes: Node[],
  updates: Array<{ nodeId: string; labelPlacement: PlacementDirection }>
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
  activeVariables: Map<string, Set<string>>,
  currentStep?: ICollectedStep
): {
  labelNodes: Node[];
  variableNodeUpdates: Array<{
    nodeId: string;
    labelPlacement: PlacementDirection;
  }>;
} => {
  const labelNodes: Node[] = [];
  const variableNodeUpdates: Array<{
    nodeId: string;
    labelPlacement: PlacementDirection;
  }> = [];

  // In step mode, label nodes should only render for a formula if:
  // 1. The step has an empty string key (applies to all formulas), OR
  // 2. The step has a key that matches this formula's id
  if (computationStore.isStepMode()) {
    const step = currentStep;
    if (step?.formulas) {
      const formulaIds = Object.keys(step.formulas);
      // If step has specific formulaIds (not just empty string for "all"),
      // only show labels if this formula is targeted
      const hasAllFormulasKey = formulaIds.includes("");
      const hasThisFormulaKey = formulaIds.includes(id);
      if (!hasAllFormulasKey && !hasThisFormulaKey) {
        return { labelNodes, variableNodeUpdates };
      }
    }
  }

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
    // In step mode, check stepValues for the display value
    // Otherwise, use the variable's value
    const displayValue = computationStore.isStepMode()
      ? computationStore.getDisplayValue(cssId)
      : variable?.value;
    // Only create label node if there's either a label OR a value
    const hasValue =
      displayValue !== undefined &&
      displayValue !== null &&
      (typeof displayValue === "number" ? !isNaN(displayValue) : true);
    const hasName = variable?.name;
    // For labelDisplay === "value", we must have a valid value to show
    // Unless there's a name, in which case we still render the label
    if (variable?.labelDisplay === "value" && !hasValue && !hasName) return;
    if (!hasValue && !hasName) return;
    // Check if this label should be visible using the same logic as LabelNode component
    // activeVariables is a Map<formulaId, Set<varId>>
    // Empty string key '' means "all formulas"
    const allFormulasVars = activeVariables.get("") ?? new Set();
    const thisFormulaVars = activeVariables.get(id) ?? new Set();
    const isVariableActive =
      allFormulasVars.has(cssId) || thisFormulaVars.has(cssId);
    // If in step mode and variable is not active, skip creating this label
    if (computationStore.isStepMode() && !isVariableActive) {
      return;
    }
    // Get the corresponding variable node to get its actual position
    const variableNode = findVariableNodeForFormula(
      currentNodes,
      formulaNode.id,
      cssId
    );
    if (!variableNode) return;
    // Use the variable node position directly (already in React Flow coordinates)
    // This avoids coordinate conversion issues and should be accurate
    const htmlElementPosition = variableNode.position;
    const htmlElementDimensions = {
      width: (variableNode.data.width as number) || 0,
      height: (variableNode.data.height as number) || 0,
    };

    // Stepnodes are always rendered above the equation.
    // If there is an active view, force labels to be below to avoid edge overlaps.
    const forcePlacement = currentStep ? "below" : undefined;

    const formulaDimensions = getNodeDimensions(formulaNode, {
      width: DEFAULT_DIMENSIONS.formulaWidth,
      height: DEFAULT_DIMENSIONS.formulaHeight,
    });

    const labelPos = getLabelNodePos(
      htmlElementPosition,
      htmlElementDimensions,
      formulaNode,
      formulaDimensions,
      viewport,
      forcePlacement
    );
    // Create the label node - initially hidden until positioned correctly
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
        formulaId: id,
        placement: labelPos.placement,
      },
      draggable: false,
      selectable: false,
      style: {
        opacity: 0, // Hidden until positioned
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
 * Optimized to only add/remove labels when the set of active variables changes,
 * NOT when values change (values are handled by LabelNode component via MobX).
 */
export const updateLabelNodes = ({
  getNodes,
  getViewport,
  setNodes,
  formulaId,
  containerElement,
  computationStore,
}: UpdateLabelNodesParams): void => {
  const currentNodes = getNodes();
  const viewport = getViewport();

  // Get active variables and current step from computation store
  const activeVariables = computationStore.getActiveVariables();
  const currentStep = computationStore.currentStep;
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

  // Get existing label nodes for this formula
  const existingLabelNodes = currentNodes.filter(
    (node) =>
      node.type === NODE_TYPES.LABEL && node.data.formulaId === formulaId
  );
  const existingLabelVarIds = new Set(
    existingLabelNodes.map((node) => node.data.varId as string)
  );

  // Calculate which labels should exist based on current activeVariables
  // We need to process the formula to determine this
  const nonLabelNodes = currentNodes.filter(
    (node) => node.type !== NODE_TYPES.LABEL
  );
  const { labelNodes: newLabelNodes, variableNodeUpdates } =
    processVariableElementsForLabels(
      formulaElement!,
      formulaNode,
      formulaId,
      nonLabelNodes,
      viewport,
      computationStore,
      activeVariables,
      currentStep
    );
  const newLabelVarIds = new Set(
    newLabelNodes.map((node) => node.data.varId as string)
  );

  // Check if the set of active variables has changed
  const sameActiveSet =
    existingLabelVarIds.size === newLabelVarIds.size &&
    [...existingLabelVarIds].every((id) => newLabelVarIds.has(id));

  if (sameActiveSet) {
    // Same active variables - no need to recreate labels
    // Just update variable node placements if needed
    if (variableNodeUpdates.length > 0) {
      setNodes((currentNodes) => {
        return updateLabelPlacement(currentNodes, variableNodeUpdates);
      });
    }
    return;
  }

  // Active variables changed - need to add/remove labels
  setNodes((currentNodes) => {
    // Keep non-label nodes
    const nonLabelNodes = currentNodes.filter(
      (node) => node.type !== NODE_TYPES.LABEL
    );

    // Keep existing labels that are still needed
    const keptLabels = existingLabelNodes.filter((node) =>
      newLabelVarIds.has(node.data.varId as string)
    );

    // Find newly needed labels (not in existing)
    const labelsToAdd = newLabelNodes.filter(
      (node) => !existingLabelVarIds.has(node.data.varId as string)
    );

    // Apply variable node updates (labelPlacement)
    const updatedNodes = updateLabelPlacement(nonLabelNodes, variableNodeUpdates);

    return [...updatedNodes, ...keptLabels, ...labelsToAdd];
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
}: AddLabelNodesParams): void => {
  const currentNodes = getNodes();
  const viewport = getViewport();
  const labelNodes: Node[] = [];
  const variableNodeUpdates: Array<{
    nodeId: string;
    labelPlacement: PlacementDirection;
  }> = [];

  // Get active variables and current step from computation store
  const activeVariables = computationStore.getActiveVariables();
  const currentStep = computationStore.currentStep;

  forEachFormulaNode(currentNodes, (formulaNode, formulaElement, id) => {
    const { labelNodes: formulaLabels, variableNodeUpdates: formulaUpdates } =
      processVariableElementsForLabels(
        formulaElement,
        formulaNode,
        id,
        currentNodes,
        viewport,
        computationStore,
        activeVariables,
        currentStep
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

// Helper interface for label info during positioning
interface LabelInfo {
  nodeId: string;
  idealX: number; // Ideal centered X position (centered on variable)
  variableCenterX: number; // Center X of the corresponding variable node (for ordering)
  y: number;
  width: number;
  height: number;
  placement: PlacementDirection;
  parentId: string;
  finalX?: number; // Final X position after collision resolution
}

// Default dimension values for nodes
const DEFAULT_DIMENSIONS = {
  labelWidth: 40,
  labelHeight: 24,
  formulaWidth: 400,
  formulaHeight: 200,
} as const;

/**
 * Get node dimensions with fallbacks to measured, explicit, or default values
 */
const getNodeDimensions = (
  node: Node,
  defaults: { width: number; height: number }
): { width: number; height: number } => ({
  width: node.measured?.width || node.width || defaults.width,
  height: node.measured?.height || node.height || defaults.height,
});

/**
 * Find a variable node by its varId and parent formula
 */
const findVariableNodeForFormula = (
  nodes: Node[],
  formulaNodeId: string,
  varId: string
): Node | undefined => {
  return nodes.find(
    (node) => node.parentId === formulaNodeId && node.data.varId === varId
  );
};

/**
 * Sort labels by their variable's center X position
 * This maintains correct left-to-right ordering to prevent edge crossings
 */
const sortLabelsByVariablePosition = (labels: LabelInfo[]): LabelInfo[] => {
  return [...labels].sort((a, b) => a.variableCenterX - b.variableCenterX);
};

/**
 * Position all labels to avoid collisions while keeping them centered
 * First resolves collisions by pushing right, then calculates the offset
 * needed to center the result and shifts all labels left accordingly
 */
const resolveAllCollisions = (labels: LabelInfo[], spacing: number): void => {
  if (labels.length === 0) return;
  if (labels.length === 1) {
    labels[0].finalX = labels[0].idealX;
    return;
  }

  const sorted = sortLabelsByVariablePosition(labels);

  // First pass: resolve collisions by pushing right
  sorted[0].finalX = sorted[0].idealX;
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    const previousRight = previous.finalX! + previous.width;
    const minX = previousRight + spacing;
    current.finalX = Math.max(current.idealX, minX);
  }

  // Calculate how much the labels shifted right overall
  // Compare the center of the final layout to the center of ideal positions
  const idealLeft = Math.min(...sorted.map((l) => l.idealX));
  const idealRight = Math.max(...sorted.map((l) => l.idealX + l.width));
  const idealCenter = (idealLeft + idealRight) / 2;
  const finalLeft = sorted[0].finalX!;
  const finalRight =
    sorted[sorted.length - 1].finalX! + sorted[sorted.length - 1].width;
  const finalCenter = (finalLeft + finalRight) / 2;

  // Shift all labels left to re-center
  const shift = finalCenter - idealCenter;
  for (const label of sorted) {
    label.finalX = label.finalX! - shift;
  }
};

interface LabelSpacing {
  vertical: number;
  horizontal: number;
}

const DEFAULT_LABEL_SPACING: LabelSpacing = { vertical: 10, horizontal: 12 };

/**
 * Calculate the center X position of a variable node
 */
const getVariableCenterX = (variableNode: Node): number => {
  if (variableNode.measured?.width) {
    return variableNode.position.x + variableNode.measured.width / 2;
  }
  const width = (variableNode.data.width as number) || 0;
  return variableNode.position.x + width / 2;
};

/**
 * Calculate the Y position for a label based on placement
 */
const calculateLabelY = (
  placement: "above" | "below",
  labelHeight: number,
  formulaHeight: number,
  verticalSpacing: number
): number => {
  if (placement === "above") {
    return -labelHeight - verticalSpacing;
  }
  return formulaHeight + verticalSpacing;
};

/**
 * Extract label info from a label node for positioning calculations
 */
const extractLabelInfo = (
  node: Node,
  variableNodes: Node[],
  currentNodes: Node[],
  spacing: LabelSpacing
): LabelInfo | null => {
  const cssId = node.data.varId;
  const formulaId = node.data.formulaId;
  if (
    !cssId ||
    typeof cssId !== "string" ||
    !formulaId ||
    typeof formulaId !== "string"
  )
    return null;
  const formulaNode = findFormulaNodeById(currentNodes, formulaId);
  if (!formulaNode) return null;
  const variableNode = findVariableNodeForFormula(
    variableNodes,
    formulaNode.id,
    cssId
  );
  if (!variableNode || !variableNode.measured) return null;
  const labelDimensions = getNodeDimensions(node, {
    width: DEFAULT_DIMENSIONS.labelWidth,
    height: DEFAULT_DIMENSIONS.labelHeight,
  });
  const placement = (node.data.placement as PlacementDirection) || "below";
  const variableCenterX = getVariableCenterX(variableNode);
  const formulaNodeHeight =
    formulaNode.measured?.height ||
    formulaNode.height ||
    DEFAULT_DIMENSIONS.formulaHeight;
  const adjustedY = calculateLabelY(
    placement,
    labelDimensions.height,
    formulaNodeHeight,
    spacing.vertical
  );
  const idealX = variableCenterX - labelDimensions.width / 2;
  return {
    nodeId: node.id,
    idealX,
    variableCenterX,
    y: adjustedY,
    width: labelDimensions.width,
    height: labelDimensions.height,
    placement,
    parentId: formulaNode.id,
  };
};

/**
 * Collect label info for all measured label nodes
 */
const collectLabelInfo = (
  currentNodes: Node[],
  spacing: LabelSpacing
): Map<string, LabelInfo> => {
  const labelInfoMap = new Map<string, LabelInfo>();
  const variableNodes = getVariableNodes(currentNodes);
  for (const node of currentNodes) {
    if (node.type !== NODE_TYPES.LABEL || !node.measured) continue;
    const labelInfo = extractLabelInfo(
      node,
      variableNodes,
      currentNodes,
      spacing
    );
    if (labelInfo) {
      labelInfoMap.set(node.id, labelInfo);
    }
  }
  return labelInfoMap;
};

/**
 * Group labels by their parent formula and placement (above/below)
 */
const groupLabelsByFormulaAndPlacement = (
  labelInfoMap: Map<string, LabelInfo>
): Map<string, LabelInfo[]> => {
  const groupedLabels = new Map<string, LabelInfo[]>();
  for (const labelInfo of labelInfoMap.values()) {
    const key = `${labelInfo.parentId}-${labelInfo.placement}`;
    if (!groupedLabels.has(key)) {
      groupedLabels.set(key, []);
    }
    groupedLabels.get(key)!.push(labelInfo);
  }
  return groupedLabels;
};

/**
 * Process all labels within each formula/placement group to avoid overlaps
 */
const resolveCollisions = (
  groupedLabels: Map<string, LabelInfo[]>,
  horizontalSpacing: number
): void => {
  for (const labels of groupedLabels.values()) {
    resolveAllCollisions(labels, horizontalSpacing);
  }
};

/**
 * Apply calculated positions to a label node
 */
const applyLabelPosition = (node: Node, labelInfo: LabelInfo): Node => {
  const finalX = labelInfo.finalX ?? labelInfo.idealX;
  return {
    ...node,
    position: {
      x: finalX,
      y: labelInfo.y,
    },
    style: {
      ...node.style,
      opacity: 1,
      pointerEvents: "auto" as const,
    },
  };
};

/**
 * Check if any label positions have changed
 */
const hasLabelPositionChanges = (
  currentNodes: Node[],
  updatedNodes: Node[]
): boolean => {
  return updatedNodes.some((node, index) => {
    const original = currentNodes[index];
    const opacityChanged =
      original.style?.opacity !== node.style?.opacity &&
      original.style?.opacity === 0;
    return (
      original.position.x !== node.position.x ||
      original.position.y !== node.position.y ||
      opacityChanged
    );
  });
};

/**
 * Adjust label positions after they're rendered and measured
 * Uses center-of-mass approach to keep labels balanced around their variables
 */
export const adjustLabelPositions = ({
  getNodes,
  setNodes,
}: AdjustLabelPositionsParams): void => {
  const currentNodes = getNodes();
  // Collect and process label information
  const labelInfoMap = collectLabelInfo(currentNodes, DEFAULT_LABEL_SPACING);
  const groupedLabels = groupLabelsByFormulaAndPlacement(labelInfoMap);
  // Resolve collisions within each group
  resolveCollisions(groupedLabels, DEFAULT_LABEL_SPACING.horizontal);
  // Apply calculated positions to nodes
  const updatedNodes = currentNodes.map((node) => {
    if (node.type !== NODE_TYPES.LABEL || !node.measured) return node;
    const labelInfo = labelInfoMap.get(node.id);
    if (!labelInfo) return node;
    return applyLabelPosition(node, labelInfo);
  });
  if (hasLabelPositionChanges(currentNodes, updatedNodes)) {
    setNodes(updatedNodes);
  }
};
