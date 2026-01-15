import React, { useCallback, useEffect, useRef } from "react";

import { reaction, toJS } from "mobx";
import { observer } from "mobx-react-lite";

import {
  Background,
  BackgroundVariant,
  Edge,
  Node,
  NodeChange,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CanvasContextMenu } from "../rendering/canvas-context-menu";
import ExpressionNode from "../rendering/nodes/expression-node";
import FormulaNode from "../rendering/nodes/formula-node";
import LabelNode from "../rendering/nodes/label-node";
import VariableNode from "../rendering/nodes/variable-node";
import ViewNode from "../rendering/nodes/view-node";
import { computeEdgesForFormula } from "../rendering/util/edges";
import {
  adjustLabelPositions as adjustLabelPositionsUtil,
  updateLabelNodes as updateLabelNodesUtil,
} from "../rendering/util/label-node";
import {
  NODE_TYPES,
  checkAllNodesMeasured,
  findFormulaNodeById,
  getFormulaElementFromContainer,
  getLabelNodes,
  getVariableNodes,
  positionAndShowViewNodes,
} from "../rendering/util/node-helpers";
import {
  addVariableNodesForFormula,
  updateVarNodes,
} from "../rendering/util/variable-nodes";
import { addViewNodes as addViewNodesUtil } from "../rendering/util/view-node";
import { ComputationStore } from "../store/computation";
import { ExecutionStore } from "../store/execution";
import { useFormulize } from "./useFormulize";

const nodeTypes = {
  formula: FormulaNode,
  variable: VariableNode,
  label: LabelNode,
  view: ViewNode,
  expression: ExpressionNode,
};

interface FormulaComponentProps {
  id: string;
  className?: string;
  style?: React.CSSProperties;
}

interface FormulaCanvasInnerProps {
  id: string;
  formulas: Array<{ id: string; latex: string }>;
  computationStore: ComputationStore;
  executionStore: ExecutionStore;
}

const FormulaCanvasInner = observer(
  ({
    id,
    formulas,
    computationStore,
    executionStore,
  }: FormulaCanvasInnerProps) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [canvasVisible, setCanvasVisible] = React.useState(false);
    const [contextMenu, setContextMenu] = React.useState<{
      x: number;
      y: number;
    } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const variableNodesAddedRef = useRef(false);
    const initialFitViewCalledRef = useRef(false);
    const manuallyPositionedLabelsRef = useRef<Set<string>>(new Set());
    const viewNodeRepositionedRef = useRef(false);
    const { getNodes, getViewport, fitView } = useReactFlow();
    const nodesInitialized = useNodesInitialized();

    // Handle context menu
    const handleContextMenu = useCallback((event: React.MouseEvent) => {
      event.preventDefault();
      // Calculate position relative to the container which is now explicitly relative
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setContextMenu({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    }, []);

    const closeContextMenu = useCallback(() => {
      setContextMenu(null);
    }, []);

    // Helper function to get the formula latex by id
    // Uses the formulas prop passed from context (scoped to this provider)
    const getFormula = useCallback((): string | null => {
      // Use formulas from context (scoped per FormulizeProvider)
      if (formulas && formulas.length > 0) {
        const formula = formulas.find((f) => f.id === id);
        if (formula) {
          return formula.latex;
        }
      }
      return null;
    }, [id, formulas]);

    // Check if a label node should be visible based on step mode
    const shouldLabelBeVisible = useCallback(
      (varId: string): boolean => {
        // If not in step mode, always show labels
        if (!computationStore.isStepMode()) {
          return true;
        }
        // In step mode, only show labels for active variables
        return executionStore.activeVariables.has(varId);
      },
      [computationStore, executionStore]
    );

    // Function to adjust label positions after they're rendered and measured
    const adjustLabelPositions = useCallback(() => {
      adjustLabelPositionsUtil({
        getNodes,
        setNodes,
        manuallyPositionedLabels: manuallyPositionedLabelsRef.current,
      });
    }, [getNodes, setNodes]);

    // Enhanced onNodesChange that tracks which labels are manually positioned
    const handleNodesChange = useCallback(
      (changes: NodeChange[]) => {
        // Track which labels are being dragged by the user
        const currentNodes = getNodes();
        changes.forEach((change) => {
          if (change.type === "position" && change.dragging) {
            const node = currentNodes.find((n) => n.id === change.id);
            if (node && node.type === NODE_TYPES.LABEL) {
              // Mark this label as manually positioned
              manuallyPositionedLabelsRef.current.add(change.id);
            }
          }
        });

        onNodesChange(changes);
      },
      [onNodesChange, getNodes]
    );

    // Function to update only label nodes when activeVariables change
    const updateLabelNodes = useCallback(() => {
      updateLabelNodesUtil({
        getNodes,
        getViewport,
        setNodes,
        formulaId: id,
        containerElement: containerRef.current,
        computationStore,
        executionStore,
      });
    }, [getNodes, getViewport, id, setNodes, computationStore, executionStore]);

    // Function to add view nodes for step-through visualization
    const addViewNodes = useCallback(() => {
      addViewNodesUtil({
        getNodes,
        setNodes,
        setEdges,
        formulaId: id,
        executionStore,
        computationStore,
      });
    }, [getNodes, id, setNodes, setEdges, executionStore, computationStore]);

    // Function to update variable node dimensions (e.g., after CSS class changes)
    const updateVariableNodes = useCallback(() => {
      const currentNodes = getNodes();
      const viewport = getViewport();
      const formulaElement = getFormulaElementFromContainer(
        containerRef.current,
        currentNodes,
        id
      );
      if (!formulaElement) return;
      const formulaNode = findFormulaNodeById(currentNodes, id);
      if (!formulaNode || !formulaNode.measured) return;

      // Build map of existing variable nodes
      const existingVarNodes = new Map<string, Node>();
      getVariableNodes(currentNodes).forEach((node) =>
        existingVarNodes.set(node.id, node)
      );

      // Use the shared helper to get updated nodes
      const foundNodeIds = new Set<string>();
      const { updatedNodes } = updateVarNodes(
        formulaElement,
        formulaNode,
        id,
        viewport,
        existingVarNodes,
        foundNodeIds,
        computationStore
      );

      if (updatedNodes.length > 0) {
        setNodes((nds) =>
          nds.map((node) => {
            const update = updatedNodes.find((u) => u.id === node.id);
            return update || node;
          })
        );
      }
    }, [getNodes, getViewport, id, setNodes, computationStore]);

    // Function to add variable nodes by finding them in the rendered MathJax formula
    const addVariableNodes = useCallback(() => {
      const latex = getFormula();
      if (!latex) return;
      addVariableNodesForFormula({
        getNodes,
        getViewport,
        setNodes,
        nodesInitialized,
        variableNodesAddedRef,
        formulaId: id,
        containerElement: containerRef.current,
        computationStore: computationStore,
        executionStore: executionStore,
      });
    }, [
      id,
      getFormula,
      getNodes,
      getViewport,
      nodesInitialized,
      setNodes,
      computationStore,
      executionStore,
    ]);

    // Initialize the canvas with the formula node
    useEffect(() => {
      const initializeCanvas = async () => {
        const latex = getFormula();
        if (!latex) {
          return;
        }

        // Wait for MathJax to be ready
        if (window.MathJax) {
          await window.MathJax.startup.promise;
        }

        // Reset refs and visibility when reinitializing
        variableNodesAddedRef.current = false;
        initialFitViewCalledRef.current = false;
        setCanvasVisible(false);

        // Create the main formula node
        // Pass the environment as a plain object to ensure fontSize and other settings are applied
        const environment = computationStore.environment
          ? toJS(computationStore.environment)
          : { fontSize: 1 };

        const formulaNode: Node = {
          id: `formula-${id}`,
          type: "formula",
          position: { x: 100, y: 100 },
          data: {
            latex: latex,
            id: id,
            environment: environment,
            showDragHandle: false,
          },
        };
        setNodes([formulaNode]);
        setEdges([]);
      };

      initializeCanvas();
    }, [
      getFormula,
      id,
      setNodes,
      setEdges,
      formulas,
      computationStore,
      executionStore,
    ]);

    // Add variable nodes when React Flow nodes are initialized and measured
    useEffect(() => {
      if (nodesInitialized && !variableNodesAddedRef.current) {
        addVariableNodes();
      }
    }, [nodesInitialized, nodes, addVariableNodes, id]);

    // Update variable nodes when values change
    useEffect(() => {
      if (!variableNodesAddedRef.current) return;
      const updateVariables = () => {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.type === "variable") {
              const varId = node.data.varId as string;
              const variable = computationStore.variables.get(varId);
              if (variable) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    value: variable.value,
                  },
                };
              }
            }
            return node;
          })
        );
      };

      // Listen for variable changes
      const interval = setInterval(updateVariables, 100);
      return () => clearInterval(interval);
    }, [setNodes, computationStore]);

    // Adjust label and view node positions after they're rendered and measured, then fitView
    useEffect(() => {
      if (!nodesInitialized || !variableNodesAddedRef.current) return;
      // Check if all nodes are ready for positioning
      const { labelNodes, viewNodes, allReady } = checkAllNodesMeasured(nodes);
      // Check if there are view nodes that need to be positioned (have low opacity)
      const viewNodesNeedPositioning = viewNodes.some(
        (node) => node.style?.opacity === 0.01
      );
      // Check if there are label nodes that need to be positioned (have low opacity)
      const labelNodesNeedPositioning = labelNodes.some(
        (node) => node.style?.opacity === 0.01
      );

      // Skip if initial fitView already done AND no nodes need positioning
      if (
        initialFitViewCalledRef.current &&
        !viewNodesNeedPositioning &&
        !labelNodesNeedPositioning
      ) {
        return;
      }

      // If no labels and no view nodes exist, just fitView once after variable nodes are added
      if (labelNodes.length === 0 && viewNodes.length === 0) {
        if (!initialFitViewCalledRef.current) {
          const timeoutId = setTimeout(() => {
            fitView({ padding: 0.2 });
            initialFitViewCalledRef.current = true;
            // Make canvas visible after fitView
            setTimeout(() => setCanvasVisible(true), 50);
          }, 100);
          return () => clearTimeout(timeoutId);
        }
        return;
      }

      if (allReady) {
        // Small delay to ensure all rendering is complete
        const timeoutId = setTimeout(() => {
          // Adjust label positions first
          if (labelNodes.length > 0) {
            adjustLabelPositions();
          }

          // Position view nodes to avoid label collisions, then make them visible
          if (
            viewNodes.length > 0 &&
            executionStore.currentView &&
            !viewNodeRepositionedRef.current
          ) {
            viewNodeRepositionedRef.current = true;

            // Find the formula node to calculate positions relative to it
            const formulaNode = nodes.find(
              (n) => n.type === NODE_TYPES.FORMULA && n.data.id === id
            );

            if (formulaNode) {
              setNodes((currentNodes) =>
                positionAndShowViewNodes(currentNodes, formulaNode)
              );
            }
          }

          // Fit view after all nodes are positioned and visible to avoid flashing
          if (!initialFitViewCalledRef.current) {
            setTimeout(() => {
              fitView({ padding: 0.2, duration: 300 });
              initialFitViewCalledRef.current = true;
              // Make canvas visible after fitView
              setTimeout(() => setCanvasVisible(true), 50);
            }, 100);
          }
        }, 50);

        return () => clearTimeout(timeoutId);
      }
    }, [
      nodes,
      nodesInitialized,
      adjustLabelPositions,
      setNodes,
      id,
      fitView,
      executionStore.currentView,
    ]);

    // Update labels when step mode or active variables change
    useEffect(() => {
      let timeoutId: number | null = null;

      const disposer = reaction(
        () => ({
          isStepMode: computationStore.isStepMode(),
          activeVariables: Array.from(executionStore.activeVariables),
          currentView: executionStore.currentView,
        }),
        () => {
          if (nodesInitialized && variableNodesAddedRef.current) {
            // Clear any pending timeout to prevent multiple rapid updates
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            // Debounce the label update to prevent rapid recreation
            timeoutId = window.setTimeout(() => {
              // Clear manually positioned labels when regenerating
              manuallyPositionedLabelsRef.current.clear();
              // Clear label edges but preserve view edges
              setEdges((currentEdges) =>
                currentEdges.filter((edge) => edge.id.startsWith("edge-view-"))
              );

              // Update variable node dimensions first (CSS classes may have changed)
              updateVariableNodes();

              // Update labels and view nodes with current activeVariables
              // Both are created with opacity 0.01 for measurement
              updateLabelNodes();
              addViewNodes();

              // Reset the flag so nodes will be positioned by the label adjustment effect
              viewNodeRepositionedRef.current = false;

              // The label adjustment effect will position both labels AND view nodes
              // after they're measured, then make them visible
            }, 50); // Shorter debounce for more responsive updates
          }
        }
      );

      return () => {
        disposer();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [
      nodesInitialized,
      updateVariableNodes,
      updateLabelNodes,
      addViewNodes,
      setEdges,
      adjustLabelPositions,
      fitView,
      computationStore,
      executionStore,
      id,
    ]);

    // Create edges after labels are visible and positioned
    useEffect(() => {
      if (nodes.length > 0) {
        // Check if all label nodes are visible (positioned correctly)
        const labelNodes = getLabelNodes(nodes);
        const visibleLabelNodes = labelNodes.filter(
          (node) => !node.style || node.style.opacity !== 0
        );

        // Preserve view edges (managed separately by addViewNodes)
        const existingViewEdges = edges.filter((edge) =>
          edge.id.startsWith("edge-view-")
        );

        // Only create edges if all labels are visible or there are no labels
        if (
          labelNodes.length === 0 ||
          visibleLabelNodes.length === labelNodes.length
        ) {
          const computedEdges = computeEdgesForFormula(
            id,
            nodes,
            shouldLabelBeVisible,
            new Set()
          );

          // Preserve object identity for unchanged edges to avoid re-renders
          const nextLabelEdges = computedEdges
            .map((edge) => {
              const prev = edges.find((e) => e.id === edge.id);
              if (
                prev &&
                prev.source === edge.source &&
                prev.target === edge.target &&
                prev.sourceHandle === edge.sourceHandle &&
                prev.targetHandle === edge.targetHandle &&
                prev.type === edge.type
              ) {
                return prev; // reuse previous edge object
              }
              return edge;
            })
            .sort((a, b) => a.id.localeCompare(b.id));

          // Combine label edges with preserved view edges
          const nextEdges = [...nextLabelEdges, ...existingViewEdges];

          // Shallow reference equality check to skip unnecessary setEdges
          const sameByRef =
            nextEdges.length === edges.length &&
            nextEdges.every((e, i) => e === edges[i]);
          if (!sameByRef) {
            setEdges(nextEdges);
          }
        } else {
          // Keep only view edges while labels are being positioned
          if (existingViewEdges.length !== edges.length) {
            setEdges(existingViewEdges);
          }
        }
      } else {
        // Preserve view edges even when no nodes
        const existingViewEdges = edges.filter((edge) =>
          edge.id.startsWith("edge-view-")
        );
        if (existingViewEdges.length !== edges.length) {
          setEdges(existingViewEdges);
        }
      }
    }, [nodes, edges, id, shouldLabelBeVisible, setEdges]);

    return (
      <div
        ref={containerRef}
        className="w-full h-full relative"
        onContextMenu={handleContextMenu}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          autoPanOnNodeDrag={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          minZoom={1}
          maxZoom={1}
          proOptions={{ hideAttribution: true }}
          style={{
            opacity: canvasVisible ? 1 : 0,
            transition: "opacity 0.05s ease-in",
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color="#ffffff"
          />
        </ReactFlow>
        {contextMenu && (
          <CanvasContextMenu
            position={contextMenu}
            onClose={closeContextMenu}
          />
        )}
      </div>
    );
  }
);

export const FormulaComponent: React.FC<FormulaComponentProps> = observer(
  ({ id, className = "", style = {} }) => {
    const context = useFormulize();
    const instance = context?.instance;
    const isLoading = context?.isLoading ?? true;
    const config = context?.config;
    const computationStore = context?.computationStore;
    const executionStore = context?.executionStore;

    // Get formulas from context config (scoped per FormulizeProvider)
    const formulas = config?.formulas || [];

    const containerStyle: React.CSSProperties = {
      width: "100%",
      height: style.height || "auto",
      border: "1px solid #e2e8f0",
      borderRadius: "1rem",
      overflow: "hidden",
      ...style,
    };

    // Show loading state while Formulize is initializing or no context
    if (isLoading || !instance || !computationStore || !executionStore) {
      return (
        <div
          className={`formula-component ${className}`}
          style={containerStyle}
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading formula...</div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`formula-component ${className}`}
        style={containerStyle}
        data-formula-id={id}
      >
        <ReactFlowProvider>
          <FormulaCanvasInner
            id={id}
            formulas={formulas}
            computationStore={computationStore}
            executionStore={executionStore}
          />
        </ReactFlowProvider>
      </div>
    );
  }
);

export default FormulaComponent;
