import { useCallback, useEffect, useRef } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import {
  Background,
  BackgroundVariant,
  Edge,
  Node,
  NodeChange,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { computationStore } from "../api/computation";
import { FormulaStore } from "../store/FormulaStoreManager";
import { IControls } from "../types/control";
import { IEnvironment } from "../types/environment";
import { CanvasControls } from "./canvas-controls";
import { nodeTypes as defaultNodeTypes } from "./nodes/node";
import { NodeBounds, getLabelNodePos } from "./util/label-node";

interface CanvasProps {
  formulaIndex?: number;
  formulaStore?: FormulaStore;
  controls?: IControls[];
  environment?: IEnvironment;
  nodeTypes?: NodeTypes;
  showVariableBorders?: boolean;
}

const CanvasFlow = observer(
  ({
    formulaIndex,
    formulaStore,
    controls,
    environment,
    nodeTypes: customNodeTypes = {},
    showVariableBorders = false,
  }: CanvasProps = {}) => {
    // Ref for the canvas container to observe size changes
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Track if variable nodes have been added to prevent re-adding
    const variableNodesAddedRef = useRef(false);

    // Track if initial fitView has been called to prevent re-fitting on every render
    const initialFitViewCalledRef = useRef(false);

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

      // If a specific formula index is provided, get that formula
      if (formulaIndex !== undefined && computationStore.displayedFormulas) {
        const specificFormula =
          computationStore.displayedFormulas[formulaIndex];
        if (specificFormula) {
          return [specificFormula];
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
    }, [formulaIndex, formulaStore]);

    // Initialize React Flow state first
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    /**
     * Create edges between label nodes and their corresponding variable nodes
     * @param currentNodes - The current array of nodes
     * @returns Array of edges connecting labels to variables
     */
    const createLabelVariableEdges = useCallback(
      (currentNodes: Node[]): Edge[] => {
        const edges: Edge[] = [];

        // Group nodes by formula and cssId to find matching pairs
        const variableNodes = currentNodes.filter((node) =>
          node.id.startsWith("variable-")
        );
        const labelNodes = currentNodes.filter((node) =>
          node.id.startsWith("label-")
        );
        const formulaNodes = currentNodes.filter((node) =>
          node.id.startsWith("formula-")
        );

        labelNodes.forEach((labelNode) => {
          // Extract formula index and cssId from label node ID
          // Format: label-{formulaIndex}-{cssId}
          const labelIdParts = labelNode.id.split("-");

          if (labelIdParts.length >= 3) {
            const formulaIndex = labelIdParts[1];
            const cssId = labelIdParts[2];

            // Find corresponding variable node - match by cssId, any elementIndex
            const variableNode = variableNodes.find((node) => {
              const varIdParts = node.id.split("-");
              return (
                varIdParts.length >= 4 &&
                varIdParts[0] === "variable" &&
                varIdParts[1] === formulaIndex &&
                varIdParts[2] === cssId
              );
            });

            if (variableNode) {
              // Calculate absolute positions for comparison
              // Label nodes have absolute positions
              const labelAbsoluteY = labelNode.position.y;

              // Variable nodes are subnodes - need to calculate absolute position
              let variableAbsoluteY = variableNode.position.y;

              // If variable node has a parent, add parent's position to get absolute position
              if (variableNode.parentId) {
                const parentFormulaNode = formulaNodes.find(
                  (node) => node.id === variableNode.parentId
                );
                if (parentFormulaNode) {
                  variableAbsoluteY =
                    parentFormulaNode.position.y + variableNode.position.y;
                }
              }

              // Determine which handles to use based on actual absolute positions
              // If label is above variable, connect from bottom of label to top of variable
              // If label is below variable, connect from top of label to bottom of variable
              const labelIsAbove = labelAbsoluteY < variableAbsoluteY;

              const sourceHandle = labelIsAbove
                ? "label-handle-below" // Bottom of label
                : "label-handle-above"; // Top of label

              const targetHandle = labelIsAbove
                ? "variable-handle-top" // Top of variable
                : "variable-handle-bottom"; // Bottom of variable

              const edge = {
                id: `edge-${labelNode.id}-${variableNode.id}`,
                source: labelNode.id,
                target: variableNode.id,
                sourceHandle,
                targetHandle,
                type: "straight",
                style: {
                  stroke: "#94a3b8", // slate-400 color
                  strokeWidth: 1,
                  strokeDasharray: "4 4", // Dashed line
                },
                animated: false,
                selectable: false,
                deletable: false,
              };

              edges.push(edge);
            }
          }
        });

        return edges;
      },
      []
    );

    // Enhanced onNodesChange that triggers edge updates when nodes move
    const handleNodesChange = useCallback(
      (changes: NodeChange[]) => {
        onNodesChange(changes);
      },
      [onNodesChange]
    );

    /**
     * Utility function for calculating relative position and dimensions
     * @param varRect - The DOMRect of the variable element
     * @param formulaRect - The DOMRect of the formula element
     * @param viewport - The viewport of the React Flow instance
     * @returns The relative position and dimensions of the variable element, adjusted for zoom level
     */
    const getPosAndDim = useCallback(
      (varRect: DOMRect, formulaRect: DOMRect, viewport: { zoom: number }) => {
        const position = {
          x: (varRect.left - formulaRect.left) / viewport.zoom,
          y: (varRect.top - formulaRect.top) / viewport.zoom,
        };
        const dimensions = {
          width: varRect.width / viewport.zoom,
          height: varRect.height / viewport.zoom,
        };
        return { position, dimensions };
      },
      []
    );

    // Create nodes from formulas and controls
    const createNodes = useCallback((): Node[] => {
      const nodes: Node[] = [];
      const formulas = getFormula();

      let currentY = 50; // Starting Y position

      // Add individual control nodes if controls exist
      if (controls && controls.length > 0) {
        controls.forEach((control, index) => {
          nodes.push({
            id: `control-${index}`,
            type: control.type,
            position: { x: 250, y: currentY },
            data: { control },
            draggable: true,
          });
          currentY += 100; // Add space after each control
        });
      }

      // Add formula nodes vertically
      formulas.forEach((latex, index) => {
        nodes.push({
          id: `formula-${index}`,
          type: "formula",
          position: { x: 250, y: currentY },
          data: {
            latex,
            environment,
            index,
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
        environment.visualizations.forEach((visualization, index) => {
          nodes.push({
            id: `visualization-${index}`,
            type: "visualization",
            position: { x: 800, y: vizY }, // Position to the right of formulas
            data: { visualization, environment },
            draggable: true,
            dragHandle: ".visualization-drag-handle",
          });
          vizY += 300; // Vertical spacing between visualization nodes (larger spacing)
        });
      }

      return nodes;
    }, [getFormula, controls, environment]);

    // Separate function to add label nodes after variable nodes are positioned
    const addLabelNodes = useCallback(() => {
      const currentNodes = getNodes();
      const viewport = getViewport();

      const labelNodes: Node[] = [];
      const variableNodeUpdates: Array<{
        nodeId: string;
        labelPlacement: "below" | "above";
      }> = [];

      const formulaElements = document.querySelectorAll(".formula-node");

      formulaElements.forEach((formulaElement, formulaIndex) => {
        const formulaNodeId = `formula-${formulaIndex}`;
        const formulaNode = currentNodes.find(
          (node) => node.id === formulaNodeId
        );

        if (!formulaNode || !formulaNode.measured) return;

        // Track existing labels for collision detection (within this formula)
        const existingLabels: NodeBounds[] = [];
        // Track which variables already have labels to prevent duplicates
        const processedVariables = new Set<string>();

        // Find variable elements within this formula
        const variableElements = formulaElement.querySelectorAll(
          '[class*="interactive-var-"]'
        );

        variableElements.forEach((varElement: Element) => {
          const htmlVarElement = varElement as HTMLElement;
          const cssId = htmlVarElement.id;
          if (!cssId) return;

          // Skip if we've already processed this variable
          if (processedVariables.has(cssId)) return;
          processedVariables.add(cssId);

          const variable = computationStore.variables.get(cssId);
          if (!variable?.label) return;

          // Get the corresponding variable node to get its actual position
          // Find the first variable node for this cssId since we may have multiple instances
          const variableNode = currentNodes.find((node) => {
            const varIdParts = node.id.split("-");
            return (
              varIdParts.length >= 4 &&
              varIdParts[0] === "variable" &&
              varIdParts[1] === formulaIndex.toString() &&
              varIdParts[2] === cssId
            );
          });

          if (!variableNode) return;

          // Calculate label position based on the actual variable node position
          const labelPos = getLabelNodePos(
            variableNode.position,
            {
              width: (variableNode.data.width as number) || 0,
              height: (variableNode.data.height as number) || 0,
            },
            formulaNode,
            {
              width: formulaNode.measured?.width || formulaNode.width || 400,
              height: formulaNode.measured?.height || formulaNode.height || 200,
            },
            existingLabels,
            variable.label,
            viewport
          );

          // Add this label to existing labels for future collision detection
          const estimatedLabelWidth = Math.max(
            variable.label.length * (8 / viewport.zoom),
            40 / viewport.zoom
          );
          const estimatedLabelHeight = 24 / viewport.zoom;

          existingLabels.push({
            x: labelPos.x,
            y: labelPos.y,
            width: estimatedLabelWidth,
            height: estimatedLabelHeight,
            id: `label-${formulaIndex}-${cssId}`,
            type: "label",
          });

          // Create the label node
          labelNodes.push({
            id: `label-${formulaIndex}-${cssId}`,
            type: "label",
            position: {
              x: labelPos.x,
              y: labelPos.y,
            },
            data: {
              varId: cssId,
              placement: labelPos.placement,
            },
            draggable: true,
            selectable: true,
          });

          // Track variable node updates
          variableNodeUpdates.push({
            nodeId: variableNode.id,
            labelPlacement: labelPos.placement,
          });
        });
      });

      // Add label nodes and update variable nodes with correct placement info
      if (labelNodes.length > 0 || variableNodeUpdates.length > 0) {
        setNodes((currentNodes) => {
          const updatedNodes = currentNodes.map((node) => {
            // Update variable nodes with correct label placement
            const update = variableNodeUpdates.find(
              (u: { nodeId: string; labelPlacement: "below" | "above" }) =>
                u.nodeId === node.id
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

          return [...updatedNodes, ...labelNodes];
        });
      }
    }, [getNodes, getViewport, setNodes]);

    // Function to add variable nodes as subnodes using React Flow's measurement system
    const addVariableNodes = useCallback(() => {
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
              // Remove existing variable and label nodes and add new variable nodes
              const nonVariableNodes = currentNodes.filter(
                (node) =>
                  !node.id.startsWith("variable-") &&
                  !node.id.startsWith("label-")
              );
              return [...nonVariableNodes, ...variableNodes];
            });

            // Mark that variable nodes have been added
            variableNodesAddedRef.current = true;

            // PHASE 2: Add label nodes after variable nodes are positioned
            // Use a small delay to ensure variable nodes are fully positioned
            setTimeout(() => {
              addLabelNodes();
            }, 50);
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
    }, [
      getNodes,
      getViewport,
      nodesInitialized,
      setNodes,
      getPosAndDim,
      showVariableBorders,
      addLabelNodes,
    ]);

    /**
     * Function to update variable nodes or add new ones (hybrid approach)
     */
    const updateVariableNodes = useCallback(() => {
      // Use requestAnimationFrame for cleaner timing
      requestAnimationFrame(() => {
        const processNodes = () => {
          const currentNodes = getNodes();
          const viewport = getViewport();

          if (!nodesInitialized) return;

          // Create a map of existing variable node IDs for quick lookup
          const variableNodes = new Map<string, Node>();
          const labelNodes = new Map<string, Node>();
          currentNodes.forEach((node) => {
            if (node.id.startsWith("variable-")) {
              variableNodes.set(node.id, node);
            } else if (node.id.startsWith("label-")) {
              labelNodes.set(node.id, node);
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
                  // Update existing node position and dimensions only
                  updatedNodes.push({
                    ...variableNode,
                    position,
                    data: {
                      ...variableNode.data,
                      width: dimensions.width,
                      height: dimensions.height,
                    },
                  });
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

                // Also track corresponding label nodes
                const labelNodeId = `label-${formulaIndex}-${cssId}`;
                if (labelNodes.has(labelNodeId)) {
                  foundNodeIds.add(labelNodeId);
                }
              }
            );
          });

          // Update the nodes state with variable changes only
          setNodes((currentNodes) => {
            // Keep non-variable and non-label nodes
            const nonVariableNodes = currentNodes.filter(
              (node) =>
                !node.id.startsWith("variable-") &&
                !node.id.startsWith("label-")
            );

            // Keep variable and label nodes that are still found in the DOM
            const keptVariableNodes = currentNodes.filter(
              (node) =>
                node.id.startsWith("variable-") && foundNodeIds.has(node.id)
            );

            const keptLabelNodes = currentNodes.filter(
              (node) =>
                node.id.startsWith("label-") && foundNodeIds.has(node.id)
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
              ...keptLabelNodes,
              ...newNodes,
            ];

            return finalNodeList;
          });

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
    }, [
      getNodes,
      getViewport,
      showVariableBorders,
      nodesInitialized,
      setNodes,
      getPosAndDim,
    ]);

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
          setNodes(createNodes());
          setEdges([]); // Clear edges when nodes are reset
          // Variable nodes will be added when nodes are initialized
        }
      );

      // Initial setup
      variableNodesAddedRef.current = false;
      setNodes(createNodes());
      setEdges([]); // Clear edges on initial setup

      return () => {
        disposer();
      };
    }, [createNodes, setNodes, setEdges, formulaStore, controls]);

    // Update showBorders property of existing variable nodes when showVariableBorders changes
    useEffect(() => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.type === "variable") {
            return {
              ...node,
              data: {
                ...node.data,
                showBorders: showVariableBorders,
              },
            };
          }
          return node;
        })
      );
    }, [showVariableBorders, setNodes]);

    // Add variable nodes when React Flow nodes are initialized and measured
    useEffect(() => {
      if (nodesInitialized && !variableNodesAddedRef.current) {
        addVariableNodes();
      }
    }, [nodesInitialized, addVariableNodes]);

    // Fit view after all nodes are properly loaded and positioned (only on initial load)
    useEffect(() => {
      if (
        nodesInitialized &&
        nodes.length > 0 &&
        !initialFitViewCalledRef.current
      ) {
        // Check if we have variable nodes (indicating full setup is complete)
        const hasVariableNodes = nodes.some((node) =>
          node.id.startsWith("variable-")
        );

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
    useEffect(() => {
      if (nodes.length > 0) {
        const newEdges = createLabelVariableEdges(nodes);
        setEdges(newEdges);
      } else {
        setEdges([]);
      }
    }, [nodes, createLabelVariableEdges, setEdges]);

    return (
      <div ref={canvasContainerRef} className="w-full h-full min-h-[500px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={{ ...defaultNodeTypes, ...customNodeTypes }}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.5,
            maxZoom: 1.0,
          }}
          className="bg-slate-50"
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.3}
          maxZoom={2}
          zoomOnScroll={false}
          panOnScroll={false}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          panOnDrag={true}
          selectNodesOnDrag={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
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
