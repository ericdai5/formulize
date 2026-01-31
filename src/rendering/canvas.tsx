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

import { ComputationStore } from "../store/computation";
import { ExecutionStore } from "../store/execution";
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
  checkAllNodesMeasured,
  getFormulaNodes,
  getLabelNodes,
  getVariableNodes,
  positionAndShowstepNodes,
} from "./util/node-helpers";
import { addstepNodes as addstepNodesUtil } from "./util/step-node";
import {
  useAddVariableNodes,
  useUpdateVariableNodes,
} from "./util/variable-nodes";

interface CanvasProps {
  formulaStore?: FormulaStore;
  controls?: IControls[];
  environment?: IEnvironment;
  computationStore: ComputationStore;
  executionStore: ExecutionStore;
}

const CanvasFlow = observer(
  ({
    formulaStore,
    controls,
    environment,
    computationStore,
    executionStore,
  }: CanvasProps) => {
    // Ref for the canvas container to observe size changes
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Track if variable nodes have been added to prevent re-adding
    const variableNodesAddedRef = useRef(false);

    // Track if initial fitView has been called to prevent re-fitting on every render
    const initialFitViewCalledRef = useRef(false);

    // Track pending label update timeout (outside useEffect for persistence)
    const labelUpdateTimeoutRef = useRef<number | null>(null);

    // Track if step nodes have been repositioned after label adjustment
    const stepNodeRepositionedRef = useRef(false);

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
      // activeVariables is a Map<formulaId, Set<varId>>
      // For canvas.tsx (multi-formula canvas), check all formula sets
      for (const varSet of executionStore.activeVariables.values()) {
        if (varSet.has(varId)) {
          return true;
        }
      }
      return false;
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
            computationStore,
            executionStore,
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

    // Function to add step nodes for variables with step descriptions
    const addstepNodes = useCallback(() => {
      addstepNodesUtil({
        getNodes,
        getViewport,
        setNodes,
        setEdges,
        executionStore,
        computationStore,
      });
    }, [
      getNodes,
      getViewport,
      setNodes,
      setEdges,
      executionStore,
      computationStore,
    ]);

    // Separate function to add label nodes after variable nodes are positioned
    const addLabelNodes = useCallback(() => {
      addLabelNodesUtil({
        getNodes,
        getViewport,
        setNodes,
        computationStore,
        executionStore,
      });
    }, [getNodes, getViewport, setNodes, computationStore, executionStore]);

    // Function to adjust label positions after they're rendered and measured
    const adjustLabelPositions = useCallback(() => {
      adjustLabelPositionsUtil({
        getNodes,
        setNodes,
      });
    }, [getNodes, setNodes]);

    // Function to add variable nodes as subnodes using React Flow's measurement system
    const addVariableNodes = useAddVariableNodes({
      nodesInitialized,
      setNodes,
      addLabelNodes,
      addstepNodes,
      variableNodesAddedRef,
      computationStore,
    });

    const updateVariableNodes = useUpdateVariableNodes({
      nodesInitialized,
      setNodes,
      variableNodesAddedRef,
      computationStore,
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

          // Preserve existing step edges (they are managed separately by addstepNodes)
          const existingStepEdges = edges.filter((edge) =>
            edge.id.startsWith("edge-step-")
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

          // Combine label edges with preserved step edges
          const nextEdges = [...nextLabelEdges, ...existingStepEdges];

          // Shallow reference equality check to skip unnecessary setEdges
          const sameByRef =
            nextEdges.length === edges.length &&
            nextEdges.every((e, i) => e === edges[i]);
          if (!sameByRef) {
            setEdges(nextEdges);
          }
        } else {
          // Keep only step edges while labels are being positioned
          const stepEdges = edges.filter((edge) =>
            edge.id.startsWith("edge-step-")
          );
          if (stepEdges.length !== edges.length) {
            setEdges(stepEdges);
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
          // Track activeVariables by serializing the Map to detect changes
          activeVariables: Array.from(
            executionStore.activeVariables.entries()
          ).map(([formulaId, varSet]) => [formulaId, Array.from(varSet)]),
          currentStep: executionStore.currentStep,
        }),
        () => {
          if (nodesInitialized && variableNodesAddedRef.current) {
            // Debounce using a ref that persists outside this effect
            if (labelUpdateTimeoutRef.current) {
              clearTimeout(labelUpdateTimeoutRef.current);
            }

            labelUpdateTimeoutRef.current = window.setTimeout(() => {
              // Reset view node repositioned flag so step nodes will be added
              // after labels are positioned. This must be done here (inside the timeout)
              // to ensure it happens AFTER any stale label adjustment effects have run.
              stepNodeRepositionedRef.current = false;

              // Clear manually positioned labels when regenerating
              // Remove existing label nodes, step nodes, expression nodes
              setNodes((currentNodes) => {
                const nonLabelViewExpressionNodes = currentNodes.filter(
                  (node) =>
                    node.type !== NODE_TYPES.LABEL &&
                    node.type !== NODE_TYPES.STEP &&
                    node.type !== NODE_TYPES.EXPRESSION
                );
                return nonLabelViewExpressionNodes;
              });

              // Clear edges to prevent stale edge references
              setEdges([]);

              // Update variable nodes first to ensure dimensions are correct
              // after CSS class changes (e.g., step-cue), then re-add labels and step nodes
              updateVariableNodes();
              window.setTimeout(() => {
                addLabelNodes();
                addstepNodes();
              }, 100);
            }, 100);
          }
        }
      );

      return () => {
        disposer();
      };
    }, [
      nodesInitialized,
      addLabelNodes,
      addstepNodes,
      updateVariableNodes,
      setNodes,
      setEdges,
    ]);

    // Adjust label and view node positions after they're rendered and measured
    useEffect(() => {
      if (!nodesInitialized) return;
      // Check if all nodes are ready for positioning
      const { labelNodes, stepNodes, allReady } = checkAllNodesMeasured(nodes);
      // If no labels and no step nodes exist, nothing to do
      if (labelNodes.length === 0 && stepNodes.length === 0) {
        return;
      }

      if (allReady) {
        // Small delay to ensure all rendering is complete
        const timeoutId = setTimeout(() => {
          // Adjust label positions first
          if (labelNodes.length > 0) {
            adjustLabelPositions();
          }

          // Position step nodes to avoid label collisions, then make them visible
          if (
            stepNodes.length > 0 &&
            executionStore.currentStep &&
            !stepNodeRepositionedRef.current
          ) {
            stepNodeRepositionedRef.current = true;

            // Find the first formula node
            const formulaNodes = getFormulaNodes(nodes);
            const formulaNode = formulaNodes[0];

            if (formulaNode) {
              setNodes((currentNodes) =>
                positionAndShowstepNodes(currentNodes, formulaNode)
              );
            }
          }
        }, 50);

        return () => clearTimeout(timeoutId);
      }
    }, [nodes, nodesInitialized, adjustLabelPositions, setNodes]);

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
// Note: FormulizeContext.Provider should be provided by the parent component
const Canvas = observer((props: CanvasProps) => {
  return (
    <ReactFlowProvider>
      <CanvasFlow {...props} />
    </ReactFlowProvider>
  );
});

export type { CanvasProps };
export default Canvas;
