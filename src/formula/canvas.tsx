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

    // React Flow hooks for accessing measured node data
    const { getNodes, getViewport } = useReactFlow();
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
      // Wait a bit for MathJax to finish rendering
      setTimeout(() => {
        // Get current values inside the timeout to avoid stale closures
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

          // Find variable elements within this formula
          const variableElements = formulaElement.querySelectorAll(
            '[class*="interactive-var-"]'
          );

          variableElements.forEach(
            (varElement: Element, elementIndex: number) => {
              const htmlVarElement = varElement as HTMLElement;
              const cssId = htmlVarElement.id;
              if (!cssId) return;

              // Calculate position relative to the formula node, accounting for React Flow's zoom
              const varRect = htmlVarElement.getBoundingClientRect();
              const formulaRect = formulaElement.getBoundingClientRect();
              const { relativePosition, dimensions } = getPosAndDim(
                varRect,
                formulaRect,
                viewport
              );

              variableNodes.push({
                id: `variable-${formulaIndex}-${cssId}-${elementIndex}`,
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
        });

        // Add variable nodes to existing nodes
        if (variableNodes.length > 0) {
          setNodes((currentNodes) => {
            // Remove existing variable nodes and add new ones
            const nonVariableNodes = currentNodes.filter(
              (node) => !node.id.startsWith("variable-")
            );
            return [...nonVariableNodes, ...variableNodes];
          });

          // Mark that variable nodes have been added
          variableNodesAddedRef.current = true;
        }
      }, 200); // Wait for MathJax to finish
    }, [getNodes, getViewport, nodesInitialized, setNodes]);

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

    // Re-add variable nodes when computation store variables change
    useEffect(() => {
      const disposer = reaction(
        () => Array.from(computationStore.variables.keys()),
        () => {
          if (nodesInitialized) {
            // Reset the flag to allow re-adding variable nodes
            variableNodesAddedRef.current = false;
            addVariableNodes();
          }
        }
      );
      return () => disposer();
    }, [nodesInitialized, addVariableNodes]);

    // Update variable node widths when values change
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
            // Update existing variable nodes with new widths and positions
            setTimeout(() => {
              const currentNodes = getNodes();
              const viewport = getViewport();
              const updatedNodes = currentNodes.map((node) => {
                if (node.id.startsWith("variable-")) {
                  const varId = node.data.varId as string;
                  // Find the corresponding DOM element to measure new width and position
                  const element = document.querySelector(
                    `#${CSS.escape(varId)}`
                  );
                  if (element) {
                    const rect = element.getBoundingClientRect();
                    // Find the parent formula element to calculate relative position
                    const formulaElement = element.closest(".formula-node");
                    if (formulaElement) {
                      const formulaRect =
                        formulaElement.getBoundingClientRect();
                      const { relativePosition, dimensions } = getPosAndDim(
                        rect,
                        formulaRect,
                        viewport
                      );
                      return {
                        ...node,
                        position: relativePosition,
                        data: {
                          ...node.data,
                          width: dimensions.width,
                          height: dimensions.height,
                        },
                      };
                    }
                  }
                }
                return node;
              });
              setNodes(updatedNodes);
            });
          }
        }
      );
      return () => disposer();
    }, [nodesInitialized, getNodes, getViewport, setNodes]);

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
            padding: 0.1,
            minZoom: 0.5,
            maxZoom: 1.5,
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
