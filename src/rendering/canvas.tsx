import { useCallback, useEffect, useMemo, useRef } from "react";

import { reaction } from "mobx";
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

import { unescapeLatex } from "../engine/manual/controller";
import { getVariablesFromLatexString } from "../parse/variable";
import { computationStore } from "../store/computation";
import { executionStore } from "../store/execution";
import { FormulaStore } from "../store/formulas";
import { IControls } from "../types/control";
import { IEnvironment } from "../types/environment";
import { IVisualization } from "../types/visualization";
import { CanvasControls } from "./canvas-controls";
import { nodeTypes as defaultNodeTypes } from "./nodes/node";
import { computeLabelVariableEdges } from "./util/edges";
import {
  addLabelNodes as addLabelNodesUtil,
  adjustLabelPositions as adjustLabelPositionsUtil,
} from "./util/label-node";
import {
  NODE_TYPES,
  getFormulaNodes,
  getLabelNodes,
  getVariableNodes,
} from "./util/node-helpers";
import {
  useAddVariableNodes,
  useUpdateVariableNodes,
} from "./util/variable-nodes";

interface CanvasProps {
  formulaStore?: FormulaStore;
  controls?: IControls[];
  environment?: IEnvironment;
}

const CanvasFlow = observer(
  ({ formulaStore, controls, environment }: CanvasProps = {}) => {
    // Ref for the canvas container to observe size changes
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Track if variable nodes have been added to prevent re-adding
    const variableNodesAddedRef = useRef(false);

    // Track if initial fitView has been called to prevent re-fitting on every render
    const initialFitViewCalledRef = useRef(false);

    // Track which labels have been manually positioned by the user
    const manuallyPositionedLabelsRef = useRef<Set<string>>(new Set());

    // Track pending label update timeout (outside useEffect for persistence)
    const labelUpdateTimeoutRef = useRef<number | null>(null);

    // React Flow hooks for accessing measured node data
    const { getNodes, getViewport, fitView } = useReactFlow();
    const nodesInitialized = useNodesInitialized();

    // Helper function to get expressions to render from the system
    const getFormula = useCallback((): string[] => {
      // If a custom formula store is provided, use its formula
      if (formulaStore) {
        const storeLatex = formulaStore.latexWithoutStyling;
        if (storeLatex) {
          return [storeLatex];
        }
      }
      // Use displayed formulas from computation store
      if (
        computationStore.displayedFormulas &&
        computationStore.displayedFormulas.length > 0
      ) {
        return computationStore.displayedFormulas;
      }
      return [];
    }, [formulaStore]);

    // Initialize React Flow state first
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    /**
     * Check if a label node should be visible based on the same logic as LabelNode component
     * @param varId - The variable ID to check
     * @returns true if the label should be visible, false otherwise
     */
    const shouldLabelBeVisible = useCallback((varId: string): boolean => {
      // If not in step mode, always show labels
      if (!computationStore.isStepMode()) {
        return true;
      }

      // In step mode, only show labels for active variables
      return executionStore.activeVariables.has(varId);
    }, []);

    /**
     * Create edges between label nodes and their corresponding variable nodes
     * @param currentNodes - The current array of nodes
     * @returns Array of edges connecting labels to variables
     */
    const createLabelVariableEdges = useCallback(
      (currentNodes: Node[]): Edge[] =>
        computeLabelVariableEdges(currentNodes, shouldLabelBeVisible),
      [shouldLabelBeVisible]
    );

    // Enhanced onNodesChange that triggers edge updates when nodes move
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

    // Create nodes from formulas and controls
    const createNodes = useCallback((): Node[] => {
      const nodes: Node[] = [];
      const formulas = getFormula();

      let currentY = 50; // Starting Y position

      // Add interpreter control node if in step mode
      if (computationStore.isStepMode() && environment) {
        nodes.push({
          id: "interpreter-control",
          type: "interpreterControl",
          position: { x: 600, y: currentY },
          data: { environment },
          draggable: true,
        });
        currentY += 80; // Add space after interpreter controls
      }

      // Add individual control nodes if controls exist
      if (controls && controls.length > 0) {
        controls.forEach((control, index) => {
          nodes.push({
            id: `control-${index}`,
            type: "control",
            position: { x: 250, y: currentY },
            data: { control },
            draggable: true,
          });
          currentY += 100; // Add space after each control
        });
      }

      // Add formula nodes vertically
      formulas.forEach((latex, index) => {
        // Get id from environment - this is required
        const formula = environment?.formulas?.[index];
        if (!formula?.id) {
          console.error(`Formula at index ${index} missing required id`);
          return;
        }
        const id = formula.id;
        nodes.push({
          id: `formula-${id}`,
          type: "formula",
          position: { x: 250, y: currentY },
          data: {
            latex,
            environment,
            id,
          },
          draggable: true,
          dragHandle: ".formula-drag-handle",
        });
        currentY += 200; // Vertical spacing between formula nodes
      });

      // Add visualization nodes if they exist in the environment
      if (
        environment?.visualizations &&
        environment.visualizations.length > 0
      ) {
        let vizY = 0; // Start visualizations at the same Y as formulas
        environment.visualizations.forEach(
          (visualization: IVisualization, index: number) => {
            nodes.push({
              id: `visualization-${index}`,
              type: "visualization",
              position: { x: 800, y: vizY }, // Position to the right of formulas
              data: { visualization, environment },
              draggable: true,
              dragHandle: ".visualization-drag-handle",
            });
            vizY += 300; // Vertical spacing between visualization nodes (larger spacing)
          }
        );
      }

      return nodes;
    }, [getFormula, controls, environment]);

    // Function to add view nodes for variables with view descriptions
    const addViewNodes = useCallback(() => {
      const currentNodes = getNodes();
      const viewport = getViewport();
      const viewNodes: Node[] = [];
      const expressionNodes: Node[] = [];
      let viewNodeIndex = 0;

      // Get active variable IDs
      const activeVarIds = Array.from(executionStore.activeVariables);

      // Get current view description from the current step
      const viewDesc = executionStore.currentView;
      if (!viewDesc) return;

      // Extract view info
      const { varId, description: descriptionText, expression } = viewDesc;

      // Find the first formula node
      const formulaNodes = getFormulaNodes(currentNodes);
      const formulaNode = formulaNodes[0];

      if (!formulaNode) return;

      // Calculate bounding box - either from expression scope or from variable nodes
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let boundingBoxFound = false;

      // Try to use expression scope if provided (expressionScope is a LaTeX expression string)
      if (expression) {
        // Look up ALL matching scopeIds from the computation store
        const scopeIds = computationStore.getScopeIdsForExpression(expression);

        // Look up ALL variables contained in the expression string
        const variableIds = getVariablesFromLatexString(
          unescapeLatex(expression)
        );
        if (scopeIds.length > 0 || variableIds.length > 0) {
          // Query for the expression elements and combine their bounding boxes
          const formulaElement = document.querySelector(
            `[data-id="${formulaNode.id}"] .formula-node`
          );
          if (formulaElement) {
            const formulaRect = formulaElement.getBoundingClientRect();

            // Helper to add element to bounding box
            const addToBoundingBox = (element: Element | null) => {
              if (element) {
                const exprRect = element.getBoundingClientRect();
                // Expand the bounding box to include this element
                const elemMinX =
                  (exprRect.left - formulaRect.left) / viewport.zoom;
                const elemMaxX =
                  (exprRect.right - formulaRect.left) / viewport.zoom;
                const elemMinY =
                  (exprRect.top - formulaRect.top) / viewport.zoom;
                const elemMaxY =
                  (exprRect.bottom - formulaRect.top) / viewport.zoom;
                minX = Math.min(minX, elemMinX);
                maxX = Math.max(maxX, elemMaxX);
                minY = Math.min(minY, elemMinY);
                maxY = Math.max(maxY, elemMaxY);
                boundingBoxFound = true;
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
          }
        }
      }

      // Fall back to variable nodes if no expression scope or element not found
      if (!boundingBoxFound) {
        const activeVariableNodes = currentNodes.filter(
          (node) =>
            node.type === NODE_TYPES.VARIABLE &&
            activeVarIds.includes(
              (node.data as { varId?: string })?.varId || ""
            )
        );

        if (activeVariableNodes.length === 0) return;

        activeVariableNodes.forEach((node) => {
          const width =
            node.measured?.width ||
            (node.data as { width?: number })?.width ||
            20;
          const height =
            node.measured?.height ||
            (node.data as { height?: number })?.height ||
            20;
          minX = Math.min(minX, node.position.x);
          maxX = Math.max(maxX, node.position.x + width);
          minY = Math.min(minY, node.position.y);
          maxY = Math.max(maxY, node.position.y + height);
        });
      }

      // Skip if we couldn't find a valid bounding box
      if (minX === Infinity || maxX === -Infinity) return;

      // Add padding around the bounding box
      const padding = 4;
      const expressionWidth = maxX - minX + padding * 2;
      const expressionHeight = maxY - minY + padding * 2;

      const expressionNodeId = `expression-${viewNodeIndex}`;

      // Create expression node as child of formula node (same coordinate system as variables)
      expressionNodes.push({
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
      });

      // Position view node below the formula, centered under expression
      const expressionCenterX = minX - padding + expressionWidth / 2;
      const formulaHeight =
        formulaNode.measured?.height || formulaNode.height || 200;

      const viewNodePosition = {
        x: expressionCenterX,
        y: formulaHeight + 40 + viewNodeIndex * 60,
      };

      const viewNodeId = `view-${viewNodeIndex}`;

      // Create the view node as a child of the formula node
      viewNodes.push({
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
      });

      viewNodeIndex++;

      // Add view nodes and expression nodes to the canvas
      if (viewNodes.length > 0) {
        setNodes((currentNodes) => {
          // Remove existing view and expression nodes first
          const filteredNodes = currentNodes.filter(
            (node) =>
              node.type !== NODE_TYPES.VIEW &&
              node.type !== NODE_TYPES.EXPRESSION
          );
          return [...filteredNodes, ...expressionNodes, ...viewNodes];
        });

        // Add edges after nodes are rendered
        setTimeout(() => {
          const viewEdges: Edge[] = [];

          // Create edge from each view node to its corresponding expression node
          viewNodes.forEach((viewNode, index) => {
            const expressionNodeId = `expression-${index}`;
            const edgeId = `edge-view-${viewNode.id}-${expressionNodeId}`;

            viewEdges.push({
              id: edgeId,
              source: viewNode.id,
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
            });
          });

          setEdges((currentEdges) => {
            const nonViewEdges = currentEdges.filter(
              (edge) => !edge.id.startsWith("edge-view-")
            );
            return [...nonViewEdges, ...viewEdges];
          });
        }, 100);
      } else {
        // Remove view nodes, expression nodes, and view edges
        setNodes((currentNodes) =>
          currentNodes.filter(
            (node) =>
              node.type !== NODE_TYPES.VIEW &&
              node.type !== NODE_TYPES.EXPRESSION
          )
        );
        setEdges((currentEdges) =>
          currentEdges.filter((edge) => !edge.id.startsWith("edge-view-"))
        );
      }
    }, [getNodes, getViewport, setNodes, setEdges]);

    // Separate function to add label nodes after variable nodes are positioned
    const addLabelNodes = useCallback(() => {
      addLabelNodesUtil({
        getNodes,
        getViewport,
        setNodes,
      });
    }, [getNodes, getViewport, setNodes]);

    // Function to adjust label positions after they're rendered and measured
    const adjustLabelPositions = useCallback(() => {
      adjustLabelPositionsUtil({
        getNodes,
        setNodes,
        manuallyPositionedLabels: manuallyPositionedLabelsRef.current,
      });
    }, [getNodes, setNodes]);

    // Function to add variable nodes as subnodes using React Flow's measurement system
    const addVariableNodes = useAddVariableNodes({
      nodesInitialized,
      setNodes,
      addLabelNodes,
      addViewNodes,
      variableNodesAddedRef,
    });

    /**
     * Function to update variable nodes or add new ones (hybrid approach)
     */
    const updateVariableNodes = useUpdateVariableNodes({
      nodesInitialized,
      setNodes,
      variableNodesAddedRef,
    });

    // Update nodes when formulas or controls change
    useEffect(() => {
      const disposer = reaction(
        () => ({
          displayedFormulas: computationStore.displayedFormulas,
          formulaStore: formulaStore?.latexWithoutStyling,
          controls: controls,
        }),
        () => {
          // Reset the variable nodes added flag when formulas change
          variableNodesAddedRef.current = false;
          // Clear manually positioned labels when formulas change
          manuallyPositionedLabelsRef.current.clear();
          setNodes(createNodes());
          setEdges([]); // Clear edges when nodes are reset
          // Variable nodes will be added when nodes are initialized
        }
      );

      // Initial setup
      variableNodesAddedRef.current = false;
      manuallyPositionedLabelsRef.current.clear();
      setNodes(createNodes());
      setEdges([]); // Clear edges on initial setup

      return () => {
        disposer();
      };
    }, [createNodes, setNodes, setEdges, formulaStore, controls]);

    // Add variable nodes when React Flow nodes are initialized and measured
    useEffect(() => {
      if (nodesInitialized && !variableNodesAddedRef.current) {
        addVariableNodes();
      }
    }, [nodesInitialized, nodes, addVariableNodes]);

    // Fit view after all nodes are properly loaded and positioned (only on initial load)
    useEffect(() => {
      if (
        nodesInitialized &&
        nodes.length > 0 &&
        !initialFitViewCalledRef.current
      ) {
        // Check if we have variable nodes (indicating full setup is complete)
        const variableNodes = getVariableNodes(nodes);
        const hasVariableNodes = variableNodes.length > 0;

        if (hasVariableNodes) {
          fitView({ duration: 300, padding: 0.2 });
          initialFitViewCalledRef.current = true;
        }
      }
    }, [nodesInitialized, nodes, fitView]);

    // Re-add variable nodes when computation store variables or formulas change
    useEffect(() => {
      const disposer = reaction(
        () => ({
          // Watch for changes in the set of variables (additions/removals)
          variableKeys: Array.from(computationStore.variables.keys()).sort(),
          // Also watch for displayedFormulas changes which can trigger re-renders
          displayedFormulas: computationStore.displayedFormulas?.slice(),
        }),
        () => {
          if (nodesInitialized) {
            // Variables set has changed or formulas changed, need to recreate all variable nodes
            variableNodesAddedRef.current = false;
            addVariableNodes();
          }
        },
        {
          fireImmediately: false,
        }
      );
      return () => disposer();
    }, [nodesInitialized, addVariableNodes]);

    // Update variable node positions/dimensions when values change
    useEffect(() => {
      const disposer = reaction(
        () =>
          Array.from(computationStore.variables.entries()).map(
            ([id, variable]) => ({
              id,
              value: variable.value,
              precision: variable.precision || 2,
            })
          ),
        () => {
          if (nodesInitialized && variableNodesAddedRef.current) {
            updateVariableNodes();
          }
        }
      );
      return () => disposer();
    }, [nodesInitialized, updateVariableNodes]);

    // Update edges whenever nodes change to keep label-variable connections in sync
    // Only create edges after labels are positioned and visible
    useEffect(() => {
      if (nodes.length > 0) {
        // Check if all label nodes are visible (positioned correctly)
        const labelNodes = getLabelNodes(nodes);
        const visibleLabelNodes = labelNodes.filter(
          (node) => !node.style || node.style.opacity !== 0
        );

        // Only create edges if all labels are visible or there are no labels
        if (
          labelNodes.length === 0 ||
          visibleLabelNodes.length === labelNodes.length
        ) {
          const computedEdges = createLabelVariableEdges(nodes);

          // Preserve existing view edges (they are managed separately by addViewNodes)
          const existingViewEdges = edges.filter((edge) =>
            edge.id.startsWith("edge-view-")
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
          const viewEdges = edges.filter((edge) =>
            edge.id.startsWith("edge-view-")
          );
          if (viewEdges.length !== edges.length) {
            setEdges(viewEdges);
          }
        }
      } else {
        setEdges([]);
      }
    }, [nodes, edges, createLabelVariableEdges, setEdges]);

    // Update labels when step mode or active variables change
    useEffect(() => {
      const disposer = reaction(
        () => ({
          isStepMode: computationStore.isStepMode(),
          activeVariables: Array.from(executionStore.activeVariables),
          currentView: executionStore.currentView,
        }),
        () => {
          if (nodesInitialized && variableNodesAddedRef.current) {
            // Debounce using a ref that persists outside this effect
            if (labelUpdateTimeoutRef.current) {
              clearTimeout(labelUpdateTimeoutRef.current);
            }

            labelUpdateTimeoutRef.current = window.setTimeout(() => {
              // Clear manually positioned labels when regenerating
              manuallyPositionedLabelsRef.current.clear();

              // Remove existing label nodes, view nodes, expression nodes
              setNodes((currentNodes) => {
                const nonLabelViewExpressionNodes = currentNodes.filter(
                  (node) =>
                    node.type !== NODE_TYPES.LABEL &&
                    node.type !== NODE_TYPES.VIEW &&
                    node.type !== NODE_TYPES.EXPRESSION
                );
                return nonLabelViewExpressionNodes;
              });

              // Clear edges to prevent stale edge references
              setEdges([]);

              // Re-add labels and view nodes after state has settled
              window.setTimeout(() => {
                addLabelNodes();
                addViewNodes();
              }, 100);
            }, 100);
          }
        }
      );

      return () => {
        disposer();
      };
    }, [nodesInitialized, addLabelNodes, addViewNodes, setNodes, setEdges]);

    // Adjust label positions after they're rendered and measured
    useEffect(() => {
      if (!nodesInitialized) return;

      // Check if we have label nodes that are measured
      const labelNodes = getLabelNodes(nodes);
      const measuredLabelNodes = labelNodes.filter((node) => node.measured);

      // Also check that all corresponding variable nodes are measured for coordinate consistency
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
        labelNodes.length > 0 &&
        measuredLabelNodes.length === labelNodes.length &&
        allVariableNodesMeasured
      ) {
        // Small delay to ensure all rendering is complete
        const timeoutId = setTimeout(() => {
          adjustLabelPositions();
        }, 50);

        return () => clearTimeout(timeoutId);
      }
    }, [nodes, nodesInitialized, adjustLabelPositions]);

    const fitViewOptions = useMemo(
      () => ({
        padding: 0.2,
        minZoom: 0.5,
        maxZoom: 1.0,
      }),
      []
    );

    const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 1 }), []);

    const proOptions = useMemo(() => ({ hideAttribution: true }), []);

    return (
      <div ref={canvasContainerRef} className="w-full h-full min-h-[500px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={defaultNodeTypes}
          fitView
          fitViewOptions={fitViewOptions}
          className="bg-white"
          defaultViewport={defaultViewport}
          minZoom={0.3}
          maxZoom={2}
          zoomOnScroll={false}
          panOnScroll={false}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          panOnDrag={true}
          selectNodesOnDrag={false}
          preventScrolling={false}
          autoPanOnNodeDrag={false}
          proOptions={proOptions}
        >
          <Background
            color="#94A3B8"
            gap={20}
            size={1}
            variant={BackgroundVariant.Dots}
          />
          <CanvasControls />
        </ReactFlow>
      </div>
    );
  }
);

// Main Canvas component with ReactFlowProvider
const Canvas = observer((props: CanvasProps) => {
  return (
    <ReactFlowProvider>
      <CanvasFlow {...props} />
    </ReactFlowProvider>
  );
});

export type { CanvasProps };
export default Canvas;
