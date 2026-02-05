import { Edge, Node } from "@xyflow/react";

import { unescapeLatex } from "../../engine/controller";
import { ComputationStore } from "../../store/computation";
import { IView } from "../../types/step";
import { findExpression } from "../parse/formula-tree";
import {
  NODE_TYPES,
  getFormulaElement,
  getFormulaNodes,
  getStepNodeYPositionAvoidingLabels,
} from "./node-helpers";

/**
 * Bounding box for expression highlighting
 */
export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Result of creating step and expression nodes
 */
export interface StepNodesResult {
  stepNodes: Node[];
  expressionNodes: Node[];
  stepEdges: Edge[];
}

/**
 * Calculate bounding box from active variable nodes
 * @param nodes - Array of all React Flow nodes
 * @param activeVarIds - Array of active variable IDs
 * @param computationStore - Optional computation store for fresh dimensions
 * @param formulaId - Optional formula ID for formula-specific dimension lookup
 * @returns Bounding box or null if no valid bounding box found
 */
export function calculateBoundingBoxFromVariableNodes(
  nodes: Node[],
  activeVarIds: string[],
  computationStore?: ComputationStore,
  formulaId?: string
): BoundingBox | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  // If computationStore and formulaId are provided, use fresh dimensions from store
  if (computationStore && formulaId) {
    let found = false;
    for (const varId of activeVarIds) {
      // Use formula-specific key to get dimensions for the correct formula
      const dimensionKey = `${formulaId}-${varId}`;
      const dims = computationStore.getVariableDimensions(dimensionKey);
      if (dims) {
        minX = Math.min(minX, dims.x);
        maxX = Math.max(maxX, dims.x + dims.width);
        minY = Math.min(minY, dims.y);
        maxY = Math.max(maxY, dims.y + dims.height);
        found = true;
      }
    }
    if (found && minX !== Infinity && maxX !== -Infinity) {
      return { minX, maxX, minY, maxY };
    }
  }

  // Fallback to node-based measurement (may have stale dimensions)
  const activeVariableNodes = nodes.filter(
    (node) =>
      node.type === NODE_TYPES.VARIABLE &&
      activeVarIds.includes((node.data as { varId?: string })?.varId || "")
  );
  if (activeVariableNodes.length === 0) {
    return null;
  }
  activeVariableNodes.forEach((node) => {
    const width =
      node.measured?.width || (node.data as { width?: number })?.width || 20;
    const height =
      node.measured?.height || (node.data as { height?: number })?.height || 20;
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x + width);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y + height);
  });

  if (minX === Infinity || maxX === -Infinity) {
    return null;
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Calculate bounding box from expression scope (DOM-based)
 * Uses the stored formula tree with cssId values to find DOM elements.
 * This approach correctly handles edge cases like `=` inside subscripts.
 * @param expression - LaTeX expression string
 * @param formulaNode - The formula node
 * @param viewport - The React Flow viewport
 * @param computationStore - The computation store containing the formula tree
 * @param formulaId - The formula ID for tree lookup
 * @returns Bounding box or null if not found
 */
export function calculateBoundingBoxFromExpression(
  expression: string,
  formulaNode: Node,
  viewport: { zoom: number },
  computationStore: ComputationStore,
  formulaId?: string
): BoundingBox | null {
  if (!formulaId) {
    return null;
  }
  // Get the stored formula tree with cssId values
  const formulaTree = computationStore.getFormulaTree(formulaId);
  if (!formulaTree) {
    return null;
  }
  // Use AST-based subtree matching with the stored tree
  const unescapedExpression = unescapeLatex(expression);
  // Get variable symbols from computation store to parse expression with same grouping
  const variableSymbols = Array.from(computationStore.variables.keys());
  const expressionMatch = findExpression(
    formulaTree,
    unescapedExpression,
    variableSymbols
  );
  if (!expressionMatch || expressionMatch.elementIds.length === 0) {
    return null;
  }
  // Get DOM elements using the cssIds from the formula tree
  const formulaElement = getFormulaElement(formulaNode);
  if (!formulaElement) {
    return null;
  }
  const formulaRect = formulaElement.getBoundingClientRect();
  const expressionElements: Element[] = [];
  // Query DOM elements by their cssIds (from \cssId{} wrappers)
  for (const cssId of expressionMatch.elementIds) {
    const element =
      formulaElement.querySelector(`[id="${CSS.escape(cssId)}"]`) ||
      formulaElement.querySelector(`[id="${cssId}"]`);
    if (element) {
      expressionElements.push(element);
    }
  }
  if (expressionElements.length === 0) {
    return null;
  }
  // Calculate bounding box from all expression elements
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const element of expressionElements) {
    const rect = element.getBoundingClientRect();
    const elemMinX = (rect.left - formulaRect.left) / viewport.zoom;
    const elemMaxX = (rect.right - formulaRect.left) / viewport.zoom;
    const elemMinY = (rect.top - formulaRect.top) / viewport.zoom;
    const elemMaxY = (rect.bottom - formulaRect.top) / viewport.zoom;
    minX = Math.min(minX, elemMinX);
    maxX = Math.max(maxX, elemMaxX);
    minY = Math.min(minY, elemMinY);
    maxY = Math.max(maxY, elemMaxY);
  }
  if (minX === Infinity || maxX === -Infinity) {
    return null;
  }
  const boundingBox = { minX, maxX, minY, maxY };
  return boundingBox;
}

/**
 * Create a step node
 * @param stepNodeId - The ID for the step node
 * @param formulaNode - The parent formula node
 * @param view - The formula-specific step data (description, values, expression)
 * @param activeVarIds - Array of active variable IDs
 * @param position - Position for the step node
 * @param expressionNodeId - Optional expression node ID to link to
 * @returns The step node
 */
export function createstepNode(
  stepNodeId: string,
  formulaNode: Node,
  view: IView,
  activeVarIds: string[],
  position: { x: number; y: number },
  expressionNodeId?: string
): Node {
  return {
    id: stepNodeId,
    type: NODE_TYPES.STEP,
    position,
    parentId: formulaNode.id,
    origin: [0.5, 0] as [number, number],
    data: {
      description: view.description,
      activeVarIds,
      expressionNodeId,
    },
    draggable: true,
    selectable: true,
    style: {
      opacity: 0, // Hidden until positioned
      pointerEvents: "none" as const,
    },
  };
}

/**
 * Create an expression node
 * @param expressionNodeId - The ID for the expression node
 * @param formulaNode - The parent formula node
 * @param boundingBox - The bounding box for the expression
 * @param activeVarIds - Array of active variable IDs
 * @param padding - Padding around the bounding box
 * @returns The expression node
 */
export function createExpressionNode(
  expressionNodeId: string,
  formulaNode: Node,
  boundingBox: BoundingBox,
  activeVarIds: string[],
  padding: number = 4
): Node {
  const { minX, maxX, minY, maxY } = boundingBox;
  const expressionWidth = maxX - minX + padding * 2;
  const expressionHeight = maxY - minY + padding * 2;

  return {
    id: expressionNodeId,
    type: NODE_TYPES.EXPRESSION,
    position: {
      x: minX - padding,
      y: minY - padding,
    },
    parentId: formulaNode.id,
    extent: "parent",
    data: {
      width: expressionWidth,
      height: expressionHeight,
      varIds: activeVarIds,
    },
    draggable: false,
    selectable: false,
  };
}

/**
 * Create a step edge connecting a step node to an expression node
 * @param stepNodeId - The step node ID
 * @param expressionNodeId - The expression node ID
 * @returns The edge
 */
export function createViewEdge(
  stepNodeId: string,
  expressionNodeId: string
): Edge {
  return {
    id: `edge-step-${stepNodeId}-${expressionNodeId}`,
    source: stepNodeId,
    target: expressionNodeId,
    sourceHandle: "step-handle-bottom",
    targetHandle: "expression-handle-top",
    type: "default", // bezier curved edge
    style: {
      stroke: "#cbd5e1",
      strokeWidth: 1,
    },
    animated: false,
    selectable: false,
    deletable: false,
  };
}

/**
 * Parameters for creating step nodes for a single formula
 */
export interface CreatestepNodesParams {
  currentNodes: Node[];
  formulaNode: Node;
  view: IView;
  activeVarIds: string[];
  viewport?: { zoom: number };
  stepNodeIndex?: number;
  computationStore: ComputationStore;
}

/**
 * Create step and expression nodes from a formula step
 * @param params - Parameters for creating step nodes
 * @returns Object containing step nodes, expression nodes, and edges
 */
export function createStepAndExpressionNodes(
  params: CreatestepNodesParams
): StepNodesResult {
  const {
    currentNodes,
    formulaNode,
    view,
    activeVarIds,
    viewport = { zoom: 1 },
    stepNodeIndex = 0,
    computationStore,
  } = params;

  const stepNodes: Node[] = [];
  const expressionNodes: Node[] = [];
  const stepEdges: Edge[] = [];

  // Get formula ID for token lookup
  const formulaId = formulaNode.data?.id as string | undefined;

  // Only calculate expression bounding box if expression is explicitly provided
  // Expression nodes should only be created when view.expression is set
  let expressionBoundingBox: BoundingBox | null = null;
  if (view.expression) {
    expressionBoundingBox = calculateBoundingBoxFromExpression(
      view.expression,
      formulaNode,
      viewport,
      computationStore,
      formulaId
    );
  }

  // If expression is provided and we have a valid bounding box, create expression node
  if (view.expression && expressionBoundingBox) {
    const padding = 4;
    const expressionNodeId = `expression-${stepNodeIndex}`;
    expressionNodes.push(
      createExpressionNode(
        expressionNodeId,
        formulaNode,
        expressionBoundingBox,
        activeVarIds,
        padding
      )
    );

    // Calculate step node position based on expression
    const { minX, maxX } = expressionBoundingBox;
    const expressionWidth = maxX - minX + padding * 2;
    const expressionCenterX = minX - padding + expressionWidth / 2;
    const basestepNodeY = getStepNodeYPositionAvoidingLabels(
      currentNodes,
      formulaNode,
      expressionCenterX
    );

    // Create step node linked to expression
    const stepNodeId = `step-${stepNodeIndex}`;
    stepNodes.push(
      createstepNode(
        stepNodeId,
        formulaNode,
        view,
        activeVarIds,
        {
          x: expressionCenterX,
          y: basestepNodeY + stepNodeIndex * 60,
        },
        expressionNodeId
      )
    );
    // Create edge connecting step to expression
    stepEdges.push(createViewEdge(stepNodeId, expressionNodeId));
  } else {
    // No expression provided or couldn't find expression bounding box
    // Create step node without expression node
    // Try to position based on active variables, otherwise center on formula
    let viewCenterX = (formulaNode.measured?.width || 200) / 2;
    // Try to get position from active variables for better placement
    const variableBoundingBox = calculateBoundingBoxFromVariableNodes(
      currentNodes,
      activeVarIds,
      computationStore,
      formulaId
    );
    if (variableBoundingBox) {
      viewCenterX = (variableBoundingBox.minX + variableBoundingBox.maxX) / 2;
    }
    const stepNodeY = getStepNodeYPositionAvoidingLabels(
      currentNodes,
      formulaNode,
      viewCenterX
    );
    const stepNodeId = `step-${stepNodeIndex}`;
    stepNodes.push(
      createstepNode(stepNodeId, formulaNode, view, activeVarIds, {
        x: viewCenterX,
        y: stepNodeY,
      })
    );
  }

  return { stepNodes, expressionNodes, stepEdges };
}

/**
 * Parameters for the addstepNodes utility function
 */
export interface AddstepNodesParams {
  getNodes: () => Node[];
  getViewport?: () => { zoom: number; x: number; y: number };
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  formulaId?: string; // Optional: specific formula ID (for FormulaComponent)
  computationStore: ComputationStore;
}

/**
 * Add step nodes to the canvas based on current execution state
 * This is the main utility function used by both canvas.tsx and FormulaComponent.tsx
 * Supports multi-formula steps where each formula can have its own step data.
 */
export function addstepNodes({
  getNodes,
  getViewport,
  setNodes,
  setEdges,
  formulaId,
  computationStore,
}: AddstepNodesParams): void {
  const currentNodes = getNodes();
  const viewport = getViewport?.() || { zoom: 1, x: 0, y: 0 };
  // Get current step from computation store
  const step = computationStore.currentStep;
  if (!step || !step.formulas || Object.keys(step.formulas).length === 0) {
    // Remove step and expression nodes if no current step
    setNodes((currentNodes) =>
      currentNodes.filter(
        (node) =>
          node.type !== NODE_TYPES.STEP && node.type !== NODE_TYPES.EXPRESSION
      )
    );
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => !edge.id.startsWith("edge-step-"))
    );
    return;
  }

  // Collect all step nodes, expression nodes, and edges across all matching formulas
  const allstepNodes: Node[] = [];
  const allExpressionNodes: Node[] = [];
  const allStepEdges: Edge[] = [];
  let stepNodeIndex = 0;

  // Iterate over each formula step
  for (const [viewFormulaId, view] of Object.entries(step?.formulas ?? {})) {
    // Empty string viewFormulaId means "apply to all formulas"
    const isAllFormulas = viewFormulaId === "";

    // Determine which formula node to use
    let formulaNode: Node | undefined;

    if (formulaId) {
      // FormulaComponent context: we have a specific formulaId
      // Check if this step applies to this formula
      if (!isAllFormulas && viewFormulaId !== formulaId) {
        // This step is for a different formula, skip it
        continue;
      }
      // Find the formula node for this component
      formulaNode = currentNodes.find(
        (node) => node.type === NODE_TYPES.FORMULA && node.data.id === formulaId
      );
    } else {
      // Canvas context: no specific formulaId
      if (isAllFormulas) {
        // Apply to first formula node
        const formulaNodes = getFormulaNodes(currentNodes);
        formulaNode = formulaNodes[0];
      } else {
        // Apply to specific formula by viewFormulaId
        formulaNode = currentNodes.find(
          (node) =>
            node.type === NODE_TYPES.FORMULA && node.data.id === viewFormulaId
        );
      }
    }

    if (!formulaNode || !formulaNode.measured) {
      continue;
    }

    // Get active variable IDs for this formula view
    const activeVarIds = view.values ? view.values.map(([varId]) => varId) : [];

    // Create step and expression nodes for this formula
    const { stepNodes, expressionNodes, stepEdges } =
      createStepAndExpressionNodes({
        currentNodes,
        formulaNode,
        view,
        activeVarIds,
        viewport,
        stepNodeIndex,
        computationStore,
      });

    allstepNodes.push(...stepNodes);
    allExpressionNodes.push(...expressionNodes);
    allStepEdges.push(...stepEdges);
    stepNodeIndex += stepNodes.length;
  }

  // Add nodes to the canvas
  if (allstepNodes.length > 0) {
    setNodes((currentNodes) => {
      const filteredNodes = currentNodes.filter(
        (node) =>
          node.type !== NODE_TYPES.STEP && node.type !== NODE_TYPES.EXPRESSION
      );
      return [...filteredNodes, ...allExpressionNodes, ...allstepNodes];
    });

    // Add edges after nodes are rendered
    if (allStepEdges.length > 0) {
      setTimeout(() => {
        setEdges((currentEdges) => {
          const nonStepEdges = currentEdges.filter(
            (edge) => !edge.id.startsWith("edge-step-")
          );
          return [...nonStepEdges, ...allStepEdges];
        });
      }, 100);
    } else {
      // Remove step edges if no expression nodes
      setEdges((currentEdges) =>
        currentEdges.filter((edge) => !edge.id.startsWith("edge-step-"))
      );
    }
  } else {
    // Remove step nodes, expression nodes, and stepedges
    setNodes((currentNodes) =>
      currentNodes.filter(
        (node) =>
          node.type !== NODE_TYPES.STEP && node.type !== NODE_TYPES.EXPRESSION
      )
    );
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => !edge.id.startsWith("edge-step-"))
    );
  }
}
