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

import { SimpleCanvasControls } from "../rendering/canvas-controls";
import ExpressionNode from "../rendering/nodes/expression-node";
import FormulaNode from "../rendering/nodes/formula-node";
import LabelNode from "../rendering/nodes/label-node";
import VariableNode from "../rendering/nodes/variable-node";
import ViewNode from "../rendering/nodes/view-node";
import { computeEdgesForFormula } from "../rendering/util/edges";
import {
  adjustLabelPositions as adjustLabelPositionsUtil,
  processVariableElementsForLabels,
} from "../rendering/util/label-node";
import {
  NODE_TYPES,
  findFormulaNodeById,
  getLabelNodes,
  getVariableNodes,
} from "../rendering/util/node-helpers";
import { createVariableNodesFromFormula } from "../rendering/util/variable-nodes";
import { computationStore } from "../store/computation";
import { executionStore } from "../store/execution";
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

const FormulaCanvasInner = observer(({ id }: { id: string }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [canvasVisible, setCanvasVisible] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const variableNodesAddedRef = useRef(false);
  const initialFitViewCalledRef = useRef(false);
  const manuallyPositionedLabelsRef = useRef<Set<string>>(new Set());
  const { getNodes, getViewport, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  // Helper function to get the formula latex by id
  const getFormula = useCallback((): string | null => {
    if (!computationStore.environment?.formulas) {
      return null;
    }
    const formula = computationStore.environment.formulas.find(
      (f) => f.id === id
    );
    return formula ? formula.latex : null;
  }, [id]);

  // Check if a label node should be visible based on step mode
  const shouldLabelBeVisible = useCallback((varId: string): boolean => {
    // If not in step mode, always show labels
    if (!computationStore.isStepMode()) {
      return true;
    }
    // In step mode, only show labels for active variables
    return executionStore.activeVariables.has(varId);
  }, []);

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
    const currentNodes = getNodes();
    const viewport = getViewport();

    // Find the formula element in this component's DOM
    const formulaElement = containerRef.current?.querySelector(".formula-node");
    if (!formulaElement) {
      console.log("FormulaComponent: No formula element found");
      return;
    }

    // Find formula node by its id
    const formulaNode = findFormulaNodeById(currentNodes, id);
    if (!formulaNode || !formulaNode.measured) {
      console.log("FormulaComponent: Formula node not measured yet");
      return;
    }

    // Get existing variable nodes for this formula
    const existingVariableNodes = currentNodes.filter(
      (node) =>
        node.type === NODE_TYPES.VARIABLE && node.parentId === formulaNode.id
    );

    if (existingVariableNodes.length === 0) {
      console.log("FormulaComponent: No variable nodes to update labels for");
      return;
    }

    setNodes((currentNodes) => {
      // Remove existing label nodes only
      const nonLabelNodes = currentNodes.filter(
        (node) => node.type !== NODE_TYPES.LABEL
      );

      // Use helper to create label nodes based on current activeVariables
      const { labelNodes, variableNodeUpdates } =
        processVariableElementsForLabels(
          formulaElement,
          formulaNode,
          id,
          nonLabelNodes,
          viewport
        );

      // Apply variable node updates (labelPlacement)
      const updatedNodes = nonLabelNodes.map((node) => {
        if (node.type === NODE_TYPES.VARIABLE) {
          const update = variableNodeUpdates.find((u) => u.nodeId === node.id);
          if (update) {
            return {
              ...node,
              data: {
                ...node.data,
                labelPlacement: update.labelPlacement,
              },
            };
          }
        }
        return node;
      });

      return [...updatedNodes, ...labelNodes];
    });
  }, [getNodes, getViewport, id, setNodes]);

  // Function to add view nodes for step-through visualization
  const addViewNodes = useCallback(() => {
    const currentNodes = getNodes();

    // Get current view description from the current step
    const viewDesc = executionStore.currentView;
    if (!viewDesc) {
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

    // Extract view info
    const { varId, description: descriptionText } = viewDesc;

    // Find the formula node for this component
    const formulaNode = findFormulaNodeById(currentNodes, id);
    if (!formulaNode || !formulaNode.measured) {
      return;
    }

    // Get active variable IDs
    const activeVarIds = Array.from(executionStore.activeVariables);

    // Calculate bounding box from active variable nodes
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const activeVariableNodes = currentNodes.filter(
      (node) =>
        node.type === NODE_TYPES.VARIABLE &&
        activeVarIds.includes((node.data as { varId?: string })?.varId || "")
    );

    if (activeVariableNodes.length === 0) {
      // If no active variable nodes, still show view node but skip expression
      const formulaHeight = formulaNode.measured?.height || 200;

      const viewNodePosition = {
        x: (formulaNode.measured?.width || 200) / 2,
        y: formulaHeight + 40,
      };

      const viewNodeId = "view-0";

      setNodes((currentNodes) => {
        const filteredNodes = currentNodes.filter(
          (node) =>
            node.type !== NODE_TYPES.VIEW && node.type !== NODE_TYPES.EXPRESSION
        );
        return [
          ...filteredNodes,
          {
            id: viewNodeId,
            type: "view",
            position: viewNodePosition,
            parentId: formulaNode.id,
            origin: [0.5, 0] as [number, number],
            data: {
              varId,
              description: descriptionText,
              activeVarIds,
            },
            draggable: true,
            selectable: true,
          },
        ];
      });

      // Remove view edges since no expression node
      setEdges((currentEdges) =>
        currentEdges.filter((edge) => !edge.id.startsWith("edge-view-"))
      );
      return;
    }

    // Calculate bounding box from variable nodes
    activeVariableNodes.forEach((node) => {
      const width =
        node.measured?.width || (node.data as { width?: number })?.width || 20;
      const height =
        node.measured?.height ||
        (node.data as { height?: number })?.height ||
        20;
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x + width);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y + height);
    });

    // Skip if we couldn't find a valid bounding box
    if (minX === Infinity || maxX === -Infinity) return;

    // Add padding around the bounding box
    const padding = 4;
    const expressionWidth = maxX - minX + padding * 2;
    const expressionHeight = maxY - minY + padding * 2;

    const expressionNodeId = "expression-0";
    const viewNodeId = "view-0";

    // Position view node below the formula, centered under expression
    const expressionCenterX = minX - padding + expressionWidth / 2;
    const formulaHeight = formulaNode.measured?.height || 200;

    const viewNodePosition = {
      x: expressionCenterX,
      y: formulaHeight + 40,
    };

    // Create expression and view nodes
    const newExpressionNode: Node = {
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

    const newViewNode: Node = {
      id: viewNodeId,
      type: "view",
      position: viewNodePosition,
      parentId: formulaNode.id,
      origin: [0.5, 0] as [number, number],
      data: {
        varId,
        description: descriptionText,
        activeVarIds,
        expressionNodeId,
      },
      draggable: true,
      selectable: true,
    };

    setNodes((currentNodes) => {
      const filteredNodes = currentNodes.filter(
        (node) =>
          node.type !== NODE_TYPES.VIEW && node.type !== NODE_TYPES.EXPRESSION
      );
      return [...filteredNodes, newExpressionNode, newViewNode];
    });

    // Add edge from view node to expression node
    setTimeout(() => {
      const viewEdge: Edge = {
        id: `edge-view-${viewNodeId}-${expressionNodeId}`,
        source: viewNodeId,
        target: expressionNodeId,
        sourceHandle: "view-handle-top",
        targetHandle: "expression-handle-bottom",
        type: "straight",
        style: {
          stroke: "#3b82f6",
          strokeWidth: 1.5,
          strokeDasharray: "4 2",
        },
        animated: true,
        selectable: false,
        deletable: false,
      };

      setEdges((currentEdges) => {
        const nonViewEdges = currentEdges.filter(
          (edge) => !edge.id.startsWith("edge-view-")
        );
        return [...nonViewEdges, viewEdge];
      });
    }, 100);
  }, [getNodes, id, setNodes, setEdges]);

  // Function to add variable nodes by finding them in the rendered MathJax formula
  const addVariableNodes = useCallback(() => {
    const latex = getFormula();
    if (!latex) return;

    requestAnimationFrame(() => {
      const checkMathJaxAndProceed = () => {
        const currentNodes = getNodes();
        const viewport = getViewport();

        if (!nodesInitialized) return;

        // Find the formula element in this component's DOM
        const formulaElement =
          containerRef.current?.querySelector(".formula-node");
        if (!formulaElement) {
          console.log("FormulaComponent: No formula element found");
          return;
        }

        // Find formula node by its id
        const formulaNode = findFormulaNodeById(currentNodes, id);
        if (!formulaNode || !formulaNode.measured) {
          console.log("FormulaComponent: Formula node not measured yet");
          return;
        }

        // Use helper to create variable nodes for this formula
        const variableNodes = createVariableNodesFromFormula(
          formulaElement,
          formulaNode,
          id,
          viewport
        );

        // Add all nodes if we found any variables
        if (variableNodes.length > 0) {
          setNodes((currentNodes) => {
            // Remove existing variable and label nodes
            const nonVariableNodes = currentNodes.filter(
              (node) =>
                node.type !== NODE_TYPES.VARIABLE &&
                node.type !== NODE_TYPES.LABEL
            );

            // Combine nodes for processing
            const nodesWithVariables = [...nonVariableNodes, ...variableNodes];

            // Use helper to create label nodes and get variable node updates
            const { labelNodes, variableNodeUpdates } =
              processVariableElementsForLabels(
                formulaElement,
                formulaNode,
                id,
                nodesWithVariables,
                viewport
              );

            // Apply variable node updates (labelPlacement)
            const updatedVariableNodes = variableNodes.map((node) => {
              const update = variableNodeUpdates.find(
                (u) => u.nodeId === node.id
              );
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

            const allNodes = [
              ...nonVariableNodes,
              ...updatedVariableNodes,
              ...labelNodes,
            ];

            return allNodes;
          });

          variableNodesAddedRef.current = true;

          // Note: Labels will be made visible by adjustLabelPositions after they're measured
        }
      };

      // Check if MathJax is ready
      if (
        window.MathJax &&
        window.MathJax.startup &&
        window.MathJax.startup.document
      ) {
        checkMathJaxAndProceed();
      } else {
        setTimeout(checkMathJaxAndProceed, 200);
      }
    });
  }, [id, getFormula, getNodes, getViewport, nodesInitialized, setNodes]);

  // Initialize the canvas with the formula node
  useEffect(() => {
    const initializeCanvas = async () => {
      const latex = getFormula();
      if (!latex) {
        console.warn(`Formula not found with id: ${id}`);
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
  }, [getFormula, id, setNodes, setEdges]);

  // Add variable nodes when React Flow nodes are initialized and measured
  useEffect(() => {
    if (nodesInitialized && !variableNodesAddedRef.current) {
      addVariableNodes();
    }
  }, [nodesInitialized, nodes, addVariableNodes]);

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
  }, [setNodes]);

  // Adjust label positions after they're rendered and measured, then fitView
  useEffect(() => {
    if (
      !nodesInitialized ||
      !variableNodesAddedRef.current ||
      initialFitViewCalledRef.current
    )
      return;

    // Check if we have label nodes that are measured
    const labelNodes = getLabelNodes(nodes);

    // If no labels exist, just fitView once after variable nodes are added
    if (labelNodes.length === 0) {
      const timeoutId = setTimeout(() => {
        fitView({ padding: 0.2 });
        initialFitViewCalledRef.current = true;
        // Make canvas visible after fitView
        setTimeout(() => setCanvasVisible(true), 50);
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    const measuredLabelNodes = labelNodes.filter((node) => node.measured);

    // Also check that all corresponding variable nodes are measured
    // Use node properties instead of ID parsing to handle hyphens in cssId
    const variableNodes = getVariableNodes(nodes);
    const allVariableNodesMeasured = labelNodes.every((labelNode) => {
      const cssId = labelNode.data.varId;
      const labelId = labelNode.data.id;

      if (!cssId || !labelId || typeof labelId !== "string") return false;

      const variableNode = variableNodes.find((vNode) => {
        return (
          vNode.data.varId === cssId &&
          vNode.parentId &&
          typeof vNode.parentId === "string" &&
          vNode.parentId.includes(labelId)
        );
      });

      return variableNode?.measured !== undefined;
    });

    // Only adjust if we have labels, they're all measured, AND their variable nodes are measured
    if (
      measuredLabelNodes.length === labelNodes.length &&
      allVariableNodesMeasured
    ) {
      // Small delay to ensure all rendering is complete
      const timeoutId = setTimeout(() => {
        adjustLabelPositions();
        // Fit view after labels are positioned and visible to avoid flashing
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 300 });
          initialFitViewCalledRef.current = true;
          // Make canvas visible after fitView
          setTimeout(() => setCanvasVisible(true), 50);
        }, 100);
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, nodesInitialized, adjustLabelPositions, fitView]);

  // Update labels when step mode or active variables change
  useEffect(() => {
    let timeoutId: number | null = null;

    const disposer = reaction(
      () => ({
        isStepMode: computationStore.isStepMode(),
        activeVariables: Array.from(executionStore.activeVariables),
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

            // Update labels with current activeVariables
            updateLabelNodes();

            // Re-adjust positions and fitView after a delay
            setTimeout(() => {
              adjustLabelPositions();
              // Fit view to include all nodes including new labels with smooth animation
              setTimeout(() => {
                fitView({
                  padding: 0.2,
                  includeHiddenNodes: false,
                  duration: 300, // Smooth 300ms animation
                });
              }, 50);
            }, 100);
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
    updateLabelNodes,
    setEdges,
    adjustLabelPositions,
    fitView,
  ]);

  // Update view nodes when currentView changes (for step-through mode)
  useEffect(() => {
    const disposer = reaction(
      () => ({
        currentView: executionStore.currentView,
        activeVariables: Array.from(executionStore.activeVariables),
      }),
      () => {
        if (nodesInitialized && variableNodesAddedRef.current) {
          // Small delay to ensure variable nodes are updated first
          setTimeout(() => {
            addViewNodes();
            // Fit view to include view node
            setTimeout(() => {
              fitView({
                padding: 0.2,
                includeHiddenNodes: false,
                duration: 300,
              });
            }, 150);
          }, 50);
        }
      }
    );

    return () => disposer();
  }, [nodesInitialized, addViewNodes, fitView]);

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
    <div ref={containerRef} className="w-full h-full">
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
        <SimpleCanvasControls />
      </ReactFlow>
    </div>
  );
});

export const FormulaComponent: React.FC<FormulaComponentProps> = observer(
  ({ id, className = "", style = {} }) => {
    const { instance, isLoading } = useFormulize();
    const containerStyle: React.CSSProperties = {
      width: "100%",
      height: style.height || "auto",
      border: "1px solid #e2e8f0",
      borderRadius: "1rem",
      overflow: "hidden",
      ...style,
    };

    // Show loading state while Formulize is initializing
    if (isLoading || !instance) {
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
      <div className={`formula-component ${className}`} style={containerStyle}>
        <ReactFlowProvider>
          <FormulaCanvasInner id={id} />
        </ReactFlowProvider>
      </div>
    );
  }
);

export default FormulaComponent;
