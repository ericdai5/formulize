import { Edge, Node } from "@xyflow/react";

import { unescapeLatex } from "../../engine/manual/controller";
import { getVariablesFromLatexString } from "../../parse/variable";
import { ComputationStore } from "../../store/computation";
import { ExecutionStore } from "../../store/execution";
import { IView } from "../../types/step";
import {
  NODE_TYPES,
  getFormulaElement,
  getFormulaNodes,
  getViewNodeYPositionAvoidingLabels,
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
 * Result of creating view and expression nodes
 */
export interface ViewNodesResult {
  viewNodes: Node[];
  expressionNodes: Node[];
  viewEdges: Edge[];
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
 * @param expression - LaTeX expression string
 * @param formulaNode - The formula node
 * @param viewport - The React Flow viewport
 * @param computationStore - The computation store to use (optional, defaults to global)
 * @returns Bounding box or null if not found
 */
export function calculateBoundingBoxFromExpression(
  expression: string,
  formulaNode: Node,
  viewport: { zoom: number },
  computationStore: ComputationStore
): BoundingBox | null {
  // Look up ALL matching scopeIds from the computation store
  const scopeIds = computationStore.getScopeIdsForExpression(expression);

  // Look up ALL variables contained in the expression string
  const variableIds = getVariablesFromLatexString(
    unescapeLatex(expression),
    computationStore
  );

  if (scopeIds.length === 0 && variableIds.length === 0) {
    return null;
  }

  // Query for the expression elements and combine their bounding boxes
  const formulaElement = getFormulaElement(formulaNode);

  if (!formulaElement) {
    return null;
  }

  const formulaRect = formulaElement.getBoundingClientRect();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let found = false;

  // Helper to add element to bounding box
  const addToBoundingBox = (element: Element | null) => {
    if (element) {
      const exprRect = element.getBoundingClientRect();
      const elemMinX = (exprRect.left - formulaRect.left) / viewport.zoom;
      const elemMaxX = (exprRect.right - formulaRect.left) / viewport.zoom;
      const elemMinY = (exprRect.top - formulaRect.top) / viewport.zoom;
      const elemMaxY = (exprRect.bottom - formulaRect.top) / viewport.zoom;
      minX = Math.min(minX, elemMinX);
      maxX = Math.max(maxX, elemMaxX);
      minY = Math.min(minY, elemMinY);
      maxY = Math.max(maxY, elemMaxY);
      found = true;
    }
  };

  // 1. Process structural scopes
  for (const scopeId of scopeIds) {
    const exprElement = formulaElement.querySelector(`#${scopeId}`);
    addToBoundingBox(exprElement);
  }

  // 2. Process individual variables
  for (const varId of variableIds) {
    const varElement = formulaElement.querySelector(
      `[id="${CSS.escape(varId)}"]`
    );
    const fallbackElement = !varElement
      ? formulaElement.querySelector(`[id="${varId}"]`)
      : null;
    const targetElement = varElement || fallbackElement;
    addToBoundingBox(targetElement);
  }

  if (!found || minX === Infinity || maxX === -Infinity) {
    return null;
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Create a view node
 * @param viewNodeId - The ID for the view node
 * @param formulaNode - The parent formula node
 * @param viewDesc - The view description
 * @param activeVarIds - Array of active variable IDs
 * @param position - Position for the view node
 * @param expressionNodeId - Optional expression node ID to link to
 * @returns The view node
 */
export function createViewNode(
  viewNodeId: string,
  formulaNode: Node,
  view: IView,
  activeVarIds: string[],
  position: { x: number; y: number },
  expressionNodeId?: string
): Node {
  return {
    id: viewNodeId,
    type: "view",
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
      opacity: 0.01, // Nearly invisible but measurable
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
 * Create a view edge connecting a view node to an expression node
 * @param viewNodeId - The view node ID
 * @param expressionNodeId - The expression node ID
 * @returns The edge
 */
export function createViewEdge(
  viewNodeId: string,
  expressionNodeId: string
): Edge {
  return {
    id: `edge-view-${viewNodeId}-${expressionNodeId}`,
    source: viewNodeId,
    target: expressionNodeId,
    sourceHandle: "view-handle-top",
    targetHandle: "expression-handle-bottom",
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
 * Parameters for creating view nodes
 */
export interface CreateViewNodesParams {
  currentNodes: Node[];
  formulaNode: Node;
  view: IView;
  activeVarIds: string[];
  viewport?: { zoom: number };
  viewNodeIndex?: number;
  computationStore: ComputationStore;
}

/**
 * Create view and expression nodes from a view description
 * @param params - Parameters for creating view nodes
 * @returns Object containing view nodes, expression nodes, and edges
 */
export function createViewAndExpressionNodes(
  params: CreateViewNodesParams
): ViewNodesResult {
  const {
    currentNodes,
    formulaNode,
    view,
    activeVarIds,
    viewport = { zoom: 1 },
    viewNodeIndex = 0,
    computationStore,
  } = params;

  const viewNodes: Node[] = [];
  const expressionNodes: Node[] = [];
  const viewEdges: Edge[] = [];

  // Try to calculate bounding box from expression first (if provided)
  let boundingBox: BoundingBox | null = null;

  if (view.expression) {
    boundingBox = calculateBoundingBoxFromExpression(
      view.expression,
      formulaNode,
      viewport,
      computationStore
    );
  }

  // Fall back to variable nodes if no expression bounding box
  // Pass computationStore and formulaId for fresh dimensions from store
  if (!boundingBox) {
    const formulaId = formulaNode.data?.id as string | undefined;
    boundingBox = calculateBoundingBoxFromVariableNodes(
      currentNodes,
      activeVarIds,
      computationStore,
      formulaId
    );
  }

  // If still no bounding box, create view node without expression
  if (!boundingBox) {
    const viewCenterX = (formulaNode.measured?.width || 200) / 2;
    const viewNodeY = getViewNodeYPositionAvoidingLabels(
      currentNodes,
      formulaNode,
      viewCenterX
    );

    const viewNodeId = `view-${viewNodeIndex}`;
    viewNodes.push(
      createViewNode(viewNodeId, formulaNode, view, activeVarIds, {
        x: viewCenterX,
        y: viewNodeY,
      })
    );

    return { viewNodes, expressionNodes, viewEdges };
  }

  // Create expression node
  const padding = 4;
  const expressionNodeId = `expression-${viewNodeIndex}`;
  expressionNodes.push(
    createExpressionNode(
      expressionNodeId,
      formulaNode,
      boundingBox,
      activeVarIds,
      padding
    )
  );

  // Calculate view node position
  const { minX, maxX } = boundingBox;
  const expressionWidth = maxX - minX + padding * 2;
  const expressionCenterX = minX - padding + expressionWidth / 2;
  const baseViewNodeY = getViewNodeYPositionAvoidingLabels(
    currentNodes,
    formulaNode,
    expressionCenterX
  );

  // Create view node
  const viewNodeId = `view-${viewNodeIndex}`;
  viewNodes.push(
    createViewNode(
      viewNodeId,
      formulaNode,
      view,
      activeVarIds,
      {
        x: expressionCenterX,
        y: baseViewNodeY + viewNodeIndex * 60,
      },
      expressionNodeId
    )
  );

  // Create edge
  viewEdges.push(createViewEdge(viewNodeId, expressionNodeId));

  return { viewNodes, expressionNodes, viewEdges };
}

/**
 * Parameters for the addViewNodes utility function
 */
export interface AddViewNodesParams {
  getNodes: () => Node[];
  getViewport?: () => { zoom: number; x: number; y: number };
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  formulaId?: string; // Optional: specific formula ID (for FormulaComponent)
  executionStore: ExecutionStore;
  computationStore: ComputationStore;
}

/**
 * Add view nodes to the canvas based on current execution state
 * This is the main utility function used by both canvas.tsx and FormulaComponent.tsx
 */
export function addViewNodes({
  getNodes,
  getViewport,
  setNodes,
  setEdges,
  formulaId,
  executionStore,
  computationStore,
}: AddViewNodesParams): void {
  const currentNodes = getNodes();
  const viewport = getViewport?.() || { zoom: 1, x: 0, y: 0 };

  // Get current view description from the scoped execution store
  const view = executionStore.currentView;
  if (!view) {
    // Remove view and expression nodes if no current view
    setNodes((currentNodes) =>
      currentNodes.filter(
        (node) =>
          node.type !== NODE_TYPES.VIEW && node.type !== NODE_TYPES.EXPRESSION
      )
    );
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => !edge.id.startsWith("edge-view-"))
    );
    return;
  }

  // If viewDesc specifies a formulaId, only show view nodes for that formula
  // If this formula doesn't match, remove any existing view nodes and return
  if (view.formulaId && formulaId && view.formulaId !== formulaId) {
    setNodes((currentNodes) =>
      currentNodes.filter(
        (node) =>
          node.type !== NODE_TYPES.VIEW && node.type !== NODE_TYPES.EXPRESSION
      )
    );
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => !edge.id.startsWith("edge-view-"))
    );
    return;
  }

  // Get active variable IDs from the scoped execution store
  const activeVarIds = Array.from(executionStore.activeVariables);

  // Find the formula node
  let formulaNode: Node | undefined;
  if (formulaId) {
    // FormulaComponent: find by specific ID
    formulaNode = currentNodes.find(
      (node) => node.type === NODE_TYPES.FORMULA && node.data.id === formulaId
    );
  } else if (view.formulaId) {
    // Canvas with specific formulaId in view: find by that ID
    formulaNode = currentNodes.find(
      (node) =>
        node.type === NODE_TYPES.FORMULA && node.data.id === view.formulaId
    );
  } else {
    // Canvas without specific formulaId: use first formula node
    const formulaNodes = getFormulaNodes(currentNodes);
    formulaNode = formulaNodes[0];
  }

  if (!formulaNode || !formulaNode.measured) {
    return;
  }

  // Create view and expression nodes
  const { viewNodes, expressionNodes, viewEdges } =
    createViewAndExpressionNodes({
      currentNodes,
      formulaNode,
      view,
      activeVarIds,
      viewport,
      computationStore,
    });

  // Add nodes to the canvas
  if (viewNodes.length > 0) {
    setNodes((currentNodes) => {
      const filteredNodes = currentNodes.filter(
        (node) =>
          node.type !== NODE_TYPES.VIEW && node.type !== NODE_TYPES.EXPRESSION
      );
      return [...filteredNodes, ...expressionNodes, ...viewNodes];
    });

    // Add edges after nodes are rendered
    if (viewEdges.length > 0) {
      setTimeout(() => {
        setEdges((currentEdges) => {
          const nonViewEdges = currentEdges.filter(
            (edge) => !edge.id.startsWith("edge-view-")
          );
          return [...nonViewEdges, ...viewEdges];
        });
      }, 100);
    } else {
      // Remove view edges if no expression nodes
      setEdges((currentEdges) =>
        currentEdges.filter((edge) => !edge.id.startsWith("edge-view-"))
      );
    }
  } else {
    // Remove view nodes, expression nodes, and view edges
    setNodes((currentNodes) =>
      currentNodes.filter(
        (node) =>
          node.type !== NODE_TYPES.VIEW && node.type !== NODE_TYPES.EXPRESSION
      )
    );
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => !edge.id.startsWith("edge-view-"))
    );
  }
}
