import { useCallback, useEffect, useRef } from "react";
import { memo } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import {
  Background,
  BackgroundVariant,
  Edge,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize, Minus, Plus } from "lucide-react";

import { computationStore } from "../api/computation";
import { FormulaStore } from "../store/FormulaStoreManager";
import { IControls } from "../types/control";
import { IEnvironment } from "../types/environment";
import { nodeTypes as defaultNodeTypes } from "./node";
import { NodeBounds, getLabelNodePos } from "./util/label-node";

// Custom Controls Component - Memoized to prevent unnecessary re-renders
const CustomControls = memo(() => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleZoomIn = () => {
    zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    fitView({ duration: 200, padding: 0.1 });
  };

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
      <button
        onClick={handleZoomIn}
        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:scale-105 transition-all duration-200 shadow-sm"
        title="Zoom In"
      >
        <Plus size={16} />
      </button>

      <button
        onClick={handleZoomOut}
        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:scale-105 transition-all duration-200 shadow-sm"
        title="Zoom Out"
      >
        <Minus size={16} />
      </button>

      <button
        onClick={handleFitView}
        className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:scale-105 transition-all duration-200 shadow-sm"
        title="Fit View"
      >
        <Maximize size={16} />
      </button>
    </div>
  );
});

interface CanvasProps {
  variableRanges?: Record<string, [number, number]>;
  formulaIndex?: number;
  formulaStore?: FormulaStore;
  controls?: IControls[];
  environment?: IEnvironment;
  nodeTypes?: NodeTypes;
}

const CanvasFlow = observer(
  ({
    variableRanges = {},
    formulaIndex,
    formulaStore,
    controls,
    environment,
    nodeTypes: customNodeTypes = {},
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
    const [edges, , onEdgesChange] = useEdgesState<Edge>([]);

    /**
     * Utility function for calculating relative position and dimensions
     * @param varRect - The DOMRect of the variable element
     * @param formulaRect - The DOMRect of the formula element
     * @param viewport - The viewport of the React Flow instance
     * @returns The relative position and dimensions of the variable element
     */
    const getPosAndDim = useCallback(
      (varRect: DOMRect, formulaRect: DOMRect, viewport: { zoom: number }) => {
        // Calculate relative position and adjust for zoom level
        const relativePosition = {
          x: (varRect.left - formulaRect.left) / viewport.zoom,
          y: (varRect.top - formulaRect.top) / viewport.zoom,
        };
        // Adjust dimensions for zoom level
        const dimensions = {
          width: varRect.width / viewport.zoom,
          height: varRect.height / viewport.zoom,
        };
        return { relativePosition, dimensions };
      },
      []
    );

    // Create nodes from formulas and controls
    const createNodes = useCallback((): Node[] => {
      const nodes: Node[] = [];
      const formulas = getFormula();

      let currentY = 50; // Starting Y position

      // Add control panel node if controls exist
      if (controls && controls.length > 0) {
        nodes.push({
          id: "control-panel",
          type: "controlPanel",
          position: { x: 250, y: currentY },
          data: { controls },
          draggable: true,
        });
        currentY += 150; // Add space after control panel
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
            variableRanges,
            index,
          },
          draggable: true,
          dragHandle: ".formula-drag-handle",
        });
        currentY += 200; // Vertical spacing between formula nodes
      });

      return nodes;
    }, [getFormula, controls, environment, variableRanges]);

    // Function to add variable nodes as subnodes using React Flow's measurement system
    const addVariableNodes = useCallback(() => {
      // Wait for MathJax to finish rendering
      const checkMathJaxAndProceed = async () => {
        // Get current values inside the function to avoid stale closures
        const currentNodes = getNodes();
        const viewport = getViewport();

        // Only proceed if nodes are initialized and measured
        if (!nodesInitialized) return;

        const variableNodes: Node[] = [];

        // Find all formula nodes in the DOM
        const formulaElements = document.querySelectorAll(".formula-node");

        formulaElements.forEach((formulaElement, formulaIndex) => {
          // Get the corresponding formula node ID and its React Flow node data
          const formulaNodeId = `formula-${formulaIndex}`;
          const formulaNode = currentNodes.find(
            (node) => node.id === formulaNodeId
          );

          // Skip if we can't find the React Flow node or it's not measured yet
          if (!formulaNode || !formulaNode.measured) return;

          // Track existing nodes for collision detection (within this formula)
          const existingNodesInFormula: NodeBounds[] = [];

          // Find variable elements within this formula
          const variableElements = formulaElement.querySelectorAll(
            '[class*="interactive-var-"]'
          );

          // First pass: create variable nodes and collect their bounds
          const variableNodesData: Array<{
            id: string;
            position: { x: number; y: number };
            dimensions: { width: number; height: number };
            cssId: string;
            elementIndex: number;
          }> = [];

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
              const { relativePosition, dimensions } = getPosAndDim(
                varRect,
                formulaRect,
                viewport
              );

              const nodeId = `variable-${formulaIndex}-${cssId}-${elementIndex}`;

              // Store variable node data for second pass
              variableNodesData.push({
                id: nodeId,
                position: relativePosition,
                dimensions,
                cssId,
                elementIndex,
              });

              // Add variable node bounds to existing nodes for collision detection
              existingNodesInFormula.push({
                x: relativePosition.x,
                y: relativePosition.y,
                width: dimensions.width,
                height: dimensions.height,
                id: nodeId,
                type: "variable",
              });

              // Create the variable node
              variableNodes.push({
                id: nodeId,
                type: "variable",
                position: relativePosition,
                parentId: formulaNodeId, // Make this a subnode of the formula
                extent: "parent", // Constrain to parent bounds
                data: {
                  varId: cssId,
                  symbol: cssId,
                  // VariableNode will get all variable data reactively from the store
                  width: dimensions.width,
                  height: dimensions.height,
                },
                draggable: false, // Subnodes typically aren't independently draggable
                selectable: true,
              });
            }
          );

          // Second pass: create label nodes with optimal positioning
          variableNodesData.forEach(
            ({ position, dimensions, cssId, elementIndex }) => {
              const variable = computationStore.variables.get(cssId);
              if (variable?.label) {
                // Get existing labels for collision detection (only labels, not variables)
                const existingLabelsOnly = existingNodesInFormula.filter(
                  (node) => node.type === "label"
                );

                // Use the sophisticated label positioning system
                const labelPos = getLabelNodePos(
                  position,
                  dimensions,
                  formulaNode,
                  {
                    width:
                      formulaNode.measured?.width || formulaNode.width || 400,
                    height:
                      formulaNode.measured?.height || formulaNode.height || 200,
                  },
                  existingLabelsOnly,
                  variable.label,
                  viewport
                );

                const labelNodeId = `label-${formulaIndex}-${cssId}-${elementIndex}`;

                // Add label node bounds to existing nodes for future collision detection
                const estimatedLabelWidth = Math.max(
                  variable.label.length * (8 / viewport.zoom),
                  40 / viewport.zoom
                );
                const estimatedLabelHeight = 24 / viewport.zoom;

                existingNodesInFormula.push({
                  x: labelPos.x,
                  y: labelPos.y,
                  width: estimatedLabelWidth,
                  height: estimatedLabelHeight,
                  id: labelNodeId,
                  type: "label",
                });

                variableNodes.push({
                  id: labelNodeId,
                  type: "label",
                  position: {
                    x: labelPos.x,
                    y: labelPos.y,
                  },
                  data: {
                    varId: cssId,
                    placement: labelPos.placement, // Pass placement info for potential styling
                  },
                  draggable: false,
                  selectable: true,
                });
              }
            }
          );
        });

        // Add variable nodes to existing nodes
        if (variableNodes.length > 0) {
          setNodes((currentNodes) => {
            // Remove existing variable nodes and add new ones
            const nonVariableNodes = currentNodes.filter(
              (node) =>
                !node.id.startsWith("variable-") &&
                !node.id.startsWith("label-")
            );
            return [...nonVariableNodes, ...variableNodes];
          });

          // Mark that variable nodes have been added
          variableNodesAddedRef.current = true;
        }
      };

      // Wait for MathJax to complete typesetting before proceeding
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().then(checkMathJaxAndProceed);
      } else if (window.MathJax && window.MathJax.startup) {
        window.MathJax.startup.promise.then(checkMathJaxAndProceed);
      } else {
        checkMathJaxAndProceed();
      }
    }, [getNodes, getViewport, nodesInitialized, setNodes, getPosAndDim]);

    // Function to update variable nodes or add new ones (hybrid approach)
    const updateOrAddVariableNodes = useCallback(() => {
      const processNodes = async () => {
        const currentNodes = getNodes();
        const viewport = getViewport();

        if (!nodesInitialized) return;

        // Create a map of existing variable node IDs for quick lookup
        const existingVariableNodes = new Map<string, Node>();
        currentNodes.forEach((node) => {
          if (node.id.startsWith("variable-") || node.id.startsWith("label-")) {
            existingVariableNodes.set(node.id, node);
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

          // Track existing nodes for collision detection (within this formula)
          const existingNodesInFormula: NodeBounds[] = [];

          // Find variable elements within this formula
          const variableElements = formulaElement.querySelectorAll(
            '[class*="interactive-var-"]'
          );

          // First pass: collect variable node data and update/create variable nodes
          const variableNodesData: Array<{
            nodeId: string;
            position: { x: number; y: number };
            dimensions: { width: number; height: number };
            cssId: string;
            elementIndex: number;
            isNew: boolean;
          }> = [];

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
              const { relativePosition, dimensions } = getPosAndDim(
                varRect,
                formulaRect,
                viewport
              );

              // Store data for label positioning
              variableNodesData.push({
                nodeId,
                position: relativePosition,
                dimensions,
                cssId,
                elementIndex,
                isNew: !existingVariableNodes.has(nodeId),
              });

              // Add to collision detection bounds
              existingNodesInFormula.push({
                x: relativePosition.x,
                y: relativePosition.y,
                width: dimensions.width,
                height: dimensions.height,
                id: nodeId,
                type: "variable",
              });

              const existingNode = existingVariableNodes.get(nodeId);

              if (existingNode) {
                // Update existing node
                updatedNodes.push({
                  ...existingNode,
                  position: relativePosition,
                  data: {
                    ...existingNode.data,
                    width: dimensions.width,
                    height: dimensions.height,
                  },
                });
              } else {
                // Create new node
                newNodes.push({
                  id: nodeId,
                  type: "variable",
                  position: relativePosition,
                  parentId: formulaNodeId,
                  extent: "parent",
                  data: {
                    varId: cssId,
                    symbol: cssId,
                    width: dimensions.width,
                    height: dimensions.height,
                  },
                  draggable: false,
                  selectable: true,
                });
              }
            }
          );

          // Second pass: handle label nodes with sophisticated positioning
          variableNodesData.forEach(
            ({ position, dimensions, cssId, elementIndex }) => {
              const labelNodeId = `label-${formulaIndex}-${cssId}-${elementIndex}`;
              foundNodeIds.add(labelNodeId);
              const variable = computationStore.variables.get(cssId);

              if (variable?.label) {
                // Get existing labels for collision detection (only labels, not variables)
                const existingLabelsOnly = existingNodesInFormula.filter(
                  (node) => node.type === "label"
                );

                // Use the sophisticated label positioning system
                const labelPos = getLabelNodePos(
                  position,
                  dimensions,
                  formulaNode,
                  {
                    width:
                      formulaNode.measured?.width || formulaNode.width || 400,
                    height:
                      formulaNode.measured?.height || formulaNode.height || 200,
                  },
                  existingLabelsOnly,
                  variable.label,
                  viewport
                );

                // Add label bounds to collision detection for subsequent labels
                const estimatedLabelWidth = Math.max(
                  variable.label.length * (8 / viewport.zoom),
                  40 / viewport.zoom
                );
                const estimatedLabelHeight = 24 / viewport.zoom;

                existingNodesInFormula.push({
                  x: labelPos.x,
                  y: labelPos.y,
                  width: estimatedLabelWidth,
                  height: estimatedLabelHeight,
                  id: labelNodeId,
                  type: "label",
                });

                const existingLabelNode =
                  existingVariableNodes.get(labelNodeId);

                if (existingLabelNode) {
                  // Update existing label node with new optimal position
                  updatedNodes.push({
                    ...existingLabelNode,
                    position: {
                      x: labelPos.x,
                      y: labelPos.y,
                    },
                    data: {
                      ...existingLabelNode.data,
                      placement: labelPos.placement,
                    },
                  });
                } else {
                  // Create new label node
                  newNodes.push({
                    id: labelNodeId,
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
                }
              }
            }
          );
        });

        // Update the nodes state
        setNodes((currentNodes) => {
          // Keep non-variable and non-label nodes
          const nonVariableNodes = currentNodes.filter(
            (node) =>
              !node.id.startsWith("variable-") && !node.id.startsWith("label-")
          );

          // Keep variable and label nodes that are still found in the DOM
          const keptVariableNodes = currentNodes.filter(
            (node) =>
              (node.id.startsWith("variable-") ||
                node.id.startsWith("label-")) &&
              foundNodeIds.has(node.id)
          );

          // Apply updates to kept variable nodes
          const finalVariableNodes = keptVariableNodes.map((node) => {
            const update = updatedNodes.find((u) => u.id === node.id);
            return update || node;
          });

          // Combine all nodes
          return [...nonVariableNodes, ...finalVariableNodes, ...newNodes];
        });

        // Mark that variable nodes have been added if we have any
        if (foundNodeIds.size > 0) {
          variableNodesAddedRef.current = true;
        }
      };

      // Wait for MathJax to complete typesetting before proceeding
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().then(processNodes);
      } else if (window.MathJax && window.MathJax.startup) {
        window.MathJax.startup.promise.then(processNodes);
      } else {
        processNodes();
      }
    }, [getNodes, getViewport, nodesInitialized, setNodes, getPosAndDim]);

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
          // Variable nodes will be added when nodes are initialized
        }
      );

      // Initial setup
      variableNodesAddedRef.current = false;
      setNodes(createNodes());

      return () => {
        disposer();
      };
    }, [createNodes, setNodes, formulaStore, controls]);

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
            // Use the hybrid approach for both normal and step modes
            updateOrAddVariableNodes();
          }
        }
      );
      return () => disposer();
    }, [nodesInitialized, updateOrAddVariableNodes]);

    return (
      <div ref={canvasContainerRef} className="w-full h-full min-h-[500px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
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
          <CustomControls />
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
