import type { MutableRefObject } from "react";

import { Node, useReactFlow } from "@xyflow/react";

import { ComputationStore } from "../../store/computation";
import { ExecutionStore } from "../../store/execution";
import { VAR_SELECTORS } from "../css-classes";
import {
  processVariableElementsForLabels,
  updateLabelPlacement,
} from "./label-node";
import {
  NODE_TYPES,
  findFormulaNodeById,
  forEachFormulaNode,
  getFormulaElementFromContainer,
  getRelativePositionAndDimensions,
  getVariableNodes,
} from "./node-helpers";

/*********** Helper Functions for Variable Nodes ***********/

/**
 * Check if MathJax is ready and execute callback, or wait and retry
 * @param callback - Function to execute when MathJax is ready
 * @param delay - Delay in ms to wait if MathJax isn't ready (default 200)
 */
export function whenMathJaxReady(
  callback: () => void,
  delay: number = 200
): void {
  if (
    window.MathJax &&
    window.MathJax.startup &&
    window.MathJax.startup.document
  ) {
    callback();
  } else {
    setTimeout(callback, delay);
  }
}

/**
 * Calculate position and dimensions of a variable element relative to its formula
 * @param varElement - The variable HTML element
 * @param formulaElement - The formula container element
 * @param viewport - The React Flow viewport
 * @returns Position and dimensions for creating a variable node
 */
export function getVariablePositionAndDimensions(
  varElement: HTMLElement,
  formulaElement: Element,
  viewport: { zoom: number }
): {
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
} {
  const varRect = varElement.getBoundingClientRect();
  const formulaRect = formulaElement.getBoundingClientRect();
  return getRelativePositionAndDimensions(varRect, formulaRect, viewport);
}

/**
 * Create a variable node object
 * @param nodeId - The unique node ID
 * @param cssId - The CSS ID (varId) of the variable
 * @param position - Position relative to parent formula node
 * @param dimensions - Width and height of the variable element
 * @param parentId - The parent formula node ID
 * @param computationStore - The scoped computation store (optional, defaults to global)
 * @returns A React Flow node object for the variable
 */
export function createVariableNode(
  nodeId: string,
  cssId: string,
  position: { x: number; y: number },
  dimensions: { width: number; height: number },
  parentId: string
): Node {
  return {
    id: nodeId,
    type: "variable",
    position,
    parentId,
    extent: "parent",
    data: {
      varId: cssId,
      symbol: cssId,
      width: dimensions.width,
      height: dimensions.height,
      labelPlacement: "below",
    },
    draggable: false,
    selectable: true,
  };
}

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
export const updateVarNodes = (
  formulaElement: Element,
  formulaNode: Node,
  id: string,
  viewport: { zoom: number },
  variableNodes: Map<string, Node>,
  foundNodeIds: Set<string>,
  computationStore: ComputationStore
): { updatedNodes: Node[]; newNodes: Node[] } => {
  const updatedNodes: Node[] = [];
  const newNodes: Node[] = [];
  const variableElements = formulaElement.querySelectorAll(VAR_SELECTORS.ANY);
  variableElements.forEach((varElement: Element, elementIndex: number) => {
    const htmlVarElement = varElement as HTMLElement;
    const cssId = htmlVarElement.id;
    if (!cssId) return;
    if (!computationStore.variables.has(cssId)) return;
    const nodeId = `variable-${id}-${cssId}-${elementIndex}`;
    foundNodeIds.add(nodeId);
    const { position, dimensions } = getVariablePositionAndDimensions(
      htmlVarElement,
      formulaElement,
      viewport
    );
    const varNode = variableNodes.get(nodeId);
    if (varNode) {
      const posChanged =
        varNode.position.x !== position.x || varNode.position.y !== position.y;
      const dimChanged =
        varNode.data.width !== dimensions.width ||
        varNode.data.height !== dimensions.height;
      // Only add to updated nodes if something actually changed
      if (posChanged || dimChanged) {
        updatedNodes.push({
          ...varNode,
          position,
          data: {
            ...varNode.data,
            width: dimensions.width,
            height: dimensions.height,
          },
        });
      }
    } else {
      // Create new node
      newNodes.push(
        createVariableNode(nodeId, cssId, position, dimensions, formulaNode.id)
      );
    }
  });
  return { updatedNodes, newNodes };
};

/**
 * Create variable nodes from DOM elements for a single formula
 */
export const createVarNodes = (
  formulaElement: Element,
  formulaNode: Node,
  id: string,
  viewport: { zoom: number },
  computationStore: ComputationStore
): Node[] => {
  const { newNodes } = updateVarNodes(
    formulaElement,
    formulaNode,
    id,
    viewport,
    new Map(),
    new Set(),
    computationStore
  );
  return newNodes;
};

/**
 * Process all formula nodes and create/update variable nodes
 * @param currentNodes - All current React Flow nodes
 * @param viewport - The React Flow viewport
 * @param computationStore - Scoped computation store
 * @param existingVarNodes - Optional map of existing variable nodes (for update mode)
 * @param foundNodeIds - Optional set to track found node IDs (for update mode)
 * @returns Combined results from all formulas
 */
export const processAllFormulaVarNodes = (
  currentNodes: Node[],
  viewport: { zoom: number },
  computationStore: ComputationStore,
  existingVarNodes?: Map<string, Node>,
  foundNodeIds?: Set<string>
): { updatedNodes: Node[]; newNodes: Node[] } => {
  const updatedNodes: Node[] = [];
  const newNodes: Node[] = [];
  const varMap = existingVarNodes ?? new Map();
  const foundIds = foundNodeIds ?? new Set<string>();
  forEachFormulaNode(currentNodes, (formulaNode, formulaElement, id) => {
    const { updatedNodes: updated, newNodes: created } = updateVarNodes(
      formulaElement,
      formulaNode,
      id,
      viewport,
      varMap,
      foundIds,
      computationStore
    );
    updatedNodes.push(...updated);
    newNodes.push(...created);
  });
  return { updatedNodes, newNodes };
};

type Viewport = { zoom: number; x: number; y: number };

/**
 * Common wrapper for variable node operations
 * Handles requestAnimationFrame, MathJax readiness, and nodesInitialized check
 */
function withVarNodeContext(
  getNodes: () => Node[],
  getViewport: () => Viewport,
  nodesInitialized: boolean,
  callback: (nodes: Node[], viewport: Viewport) => void
): void {
  requestAnimationFrame(() => {
    whenMathJaxReady(() => {
      if (!nodesInitialized) return;
      callback(getNodes(), getViewport());
    });
  });
}

/**
 * Add variable nodes and label nodes for a single formula.
 * This is used by FormulaComponent where we know the specific formula ID.
 */
export function addVariableNodesForFormula({
  getNodes,
  getViewport,
  setNodes,
  nodesInitialized,
  variableNodesAddedRef,
  formulaId,
  containerElement,
  computationStore,
  executionStore,
}: {
  getNodes: () => Node[];
  getViewport: () => { zoom: number; x: number; y: number };
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  nodesInitialized: boolean;
  variableNodesAddedRef: MutableRefObject<boolean>;
  formulaId: string;
  containerElement?: Element | null;
  computationStore: ComputationStore;
  executionStore: ExecutionStore;
}): void {
  withVarNodeContext(
    getNodes,
    getViewport,
    nodesInitialized,
    (currentNodes, viewport) => {
      const formulaElement = getFormulaElementFromContainer(
        containerElement,
        currentNodes,
        formulaId
      );
      if (!formulaElement) {
        return;
      }
      const formulaNode = findFormulaNodeById(currentNodes, formulaId);
      if (!formulaNode || !formulaNode.measured) {
        return;
      }
      const varNodes = createVarNodes(
        formulaElement,
        formulaNode,
        formulaId,
        viewport,
        computationStore
      );
      if (varNodes.length === 0) {
        return;
      }
      setNodes((currentNodes) => {
        const baseNodes = currentNodes.filter(
          (node) =>
            node.type !== NODE_TYPES.VARIABLE && node.type !== NODE_TYPES.LABEL
        );
        const nodesWithVariables = [...baseNodes, ...varNodes];
        const { labelNodes, variableNodeUpdates } =
          processVariableElementsForLabels(
            formulaElement!,
            formulaNode,
            formulaId,
            nodesWithVariables,
            viewport,
            computationStore,
            executionStore
          );
        const updatedVarNodes = updateLabelPlacement(
          varNodes,
          variableNodeUpdates
        );
        return [...baseNodes, ...updatedVarNodes, ...labelNodes];
      });
      variableNodesAddedRef.current = true;
    }
  );
}

/**
 * Hook to get a function that adds variable nodes for all formulas
 */
export const useAddVariableNodes = ({
  nodesInitialized,
  setNodes,
  addLabelNodes,
  addViewNodes,
  variableNodesAddedRef,
  computationStore,
}: {
  nodesInitialized: boolean;
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  variableNodesAddedRef: MutableRefObject<boolean>;
  addLabelNodes: () => void;
  addViewNodes: () => void;
  computationStore: ComputationStore;
}) => {
  const { getNodes, getViewport } = useReactFlow();
  return () => {
    withVarNodeContext(
      getNodes,
      getViewport,
      nodesInitialized,
      (currentNodes, viewport) => {
        const { newNodes: varNodes } = processAllFormulaVarNodes(
          currentNodes,
          viewport,
          computationStore
        );
        if (varNodes.length === 0) return;
        setNodes((currentNodes) => {
          const nonVarNodes = currentNodes.filter(
            (node) => node.type !== NODE_TYPES.VARIABLE
          );
          return [...nonVarNodes, ...varNodes];
        });
        variableNodesAddedRef.current = true;
        setTimeout(() => {
          addLabelNodes();
          addViewNodes();
        }, 100);
      }
    );
  };
};

/**
 * Hook to get a function that updates variable nodes or adds new ones
 */
export const useUpdateVariableNodes = ({
  nodesInitialized,
  setNodes,
  variableNodesAddedRef,
  computationStore,
}: {
  nodesInitialized: boolean;
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  variableNodesAddedRef: MutableRefObject<boolean>;
  computationStore: ComputationStore;
}) => {
  const { getNodes, getViewport } = useReactFlow();
  return () => {
    withVarNodeContext(
      getNodes,
      getViewport,
      nodesInitialized,
      (currentNodes, viewport) => {
        const varNodes = getVariableNodes(currentNodes);
        const existingVarNodes = new Map<string, Node>();
        varNodes.forEach((node) => existingVarNodes.set(node.id, node));
        const foundNodeIds = new Set<string>();
        const { updatedNodes, newNodes } = processAllFormulaVarNodes(
          currentNodes,
          viewport,
          computationStore,
          existingVarNodes,
          foundNodeIds
        );
        const hasChanges =
          updatedNodes.length > 0 ||
          newNodes.length > 0 ||
          varNodes.some((node) => !foundNodeIds.has(node.id));
        if (hasChanges) {
          setNodes((currentNodes) => {
            const nonVarNodes = currentNodes.filter(
              (node) => node.type !== NODE_TYPES.VARIABLE
            );
            const keptVarNodes = getVariableNodes(currentNodes).filter((node) =>
              foundNodeIds.has(node.id)
            );
            const finalVarNodes = keptVarNodes.map(
              (node) => updatedNodes.find((u) => u.id === node.id) || node
            );
            return [...nonVarNodes, ...finalVarNodes, ...newNodes];
          });
        }
        if (foundNodeIds.size > 0) {
          variableNodesAddedRef.current = true;
        }
      }
    );
  };
};
