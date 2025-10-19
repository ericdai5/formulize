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

import { computationStore } from "../store/computation";
import { executionStore } from "../store/execution";
import { FormulaStore } from "../store/formulas";
import { IControls } from "../types/control";
import { IEnvironment } from "../types/environment";
import { CanvasControls } from "./canvas-controls";
import { nodeTypes as defaultNodeTypes } from "./nodes/node";
import { NodeBounds, getLabelNodePos } from "./util/label-node";
import {
  addVariableNodes as addVariableNodesUtil,
  updateVariableNodes as updateVariableNodesUtil,
} from "./util/variable-nodes";

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
     * Check if a label node should be visible based on the same logic as LabelNode component
     * @param varId - The variable ID to check
     * @returns true if the label should be visible, false otherwise
     */
    const shouldLabelBeVisible = useCallback(
      (varId: string): boolean => {
        // If not in step mode, always show labels
        if (!computationStore.isStepMode()) {
          return true;
        }

        // In step mode, only show labels for active variables
        return executionStore.activeVariables.has(varId);
      },
      [computationStore.isStepMode(), executionStore.activeVariables]
    );

    /**
     * Create edges between label nodes and their corresponding variable nodes
     * @param currentNodes - The current array of nodes
     * @returns Array of edges connecting labels to variables
     */
    const createLabelVariableEdges = useCallback(
      (currentNodes: Node[]): Edge[] => {
        const edges: Edge[] = [];
        const createdEdgeIds = new Set<string>(); // Track created edge IDs to prevent duplicates

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
          // Extract varId from label node data to check visibility
          const labelNodeData = labelNode.data as { varId?: string };
          const varId = labelNodeData?.varId;

          // Skip creating edges for labels that should not be visible
          if (!varId || !shouldLabelBeVisible(varId)) {
            return;
          }
          // Extract formula index and cssId from label node ID
          // Format: label-{formulaIndex}-{cssId}
          const labelIdParts = labelNode.id.split("-");

          if (labelIdParts.length >= 3) {
            const formulaIndex = labelIdParts[1];
            const cssId = labelIdParts[2];

            // Find ALL corresponding variable nodes for this cssId to handle multiple instances
            const matchingVariableNodes = variableNodes.filter((node) => {
              const varIdParts = node.id.split("-");
              return (
                varIdParts.length >= 4 &&
                varIdParts[0] === "variable" &&
                varIdParts[1] === formulaIndex &&
                varIdParts[2] === cssId
              );
            });

            // Connect to the first variable node (most common case)
            // TODO: In the future, we might want to connect to all instances or choose the best one
            const variableNode = matchingVariableNodes[0];

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

              const edgeId = `edge-${labelNode.id}-${variableNode.id}`;

              // Skip if we've already created this edge
              if (createdEdgeIds.has(edgeId)) {
                return;
              }

              const edge = {
                id: edgeId,
                source: labelNode.id,
                target: variableNode.id,
                sourceHandle,
                targetHandle,
                type: "straight",
                style: {
                  stroke: "#94a3b8", // slate-400 color
                  strokeWidth: 1,
                  strokeDasharray: "2 1", // Smaller, denser dashed line
                },
                animated: false,
                selectable: false,
                deletable: false,
              };

              createdEdgeIds.add(edgeId);
              edges.push(edge);
            }
          }
        });

        return edges;
      },
      [shouldLabelBeVisible]
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

      // Add interpreter control node if in step mode
      if (computationStore.isStepMode() && environment) {
        nodes.push({
          id: "interpreter-control",
          type: "interpreterControl",
          position: { x: 600, y: currentY },
          data: { environment },
          draggable: true,
          dragHandle: ".interpreter-drag-handle",
        });
        currentY += 80; // Add space after interpreter controls
      }

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

    // Function to add view nodes for variables with view descriptions
    const addViewNodes = useCallback(() => {
      const currentNodes = getNodes();
      const viewNodes: Node[] = [];
      let viewNodeIndex = 0; // Counter for positioning multiple view nodes

      // Iterate through view descriptions to create view nodes
      Object.entries(executionStore.currentViewDescriptions).forEach(
        ([expression, description]) => {
          if (!description) return;

          // Find the first formula node (typically formula-0)
          const formulaNode = currentNodes.find((node) =>
            node.id.startsWith("formula-")
          );

          if (!formulaNode) return;

          // Position view node directly below the formula node
          const viewNodePosition = {
            x: formulaNode.position.x,
            y:
              formulaNode.position.y +
              (formulaNode.measured?.height || formulaNode.height || 200) +
              100 +
              viewNodeIndex * 60,
          };

          // Create the view node
          viewNodes.push({
            id: `view-${viewNodeIndex}`,
            type: "view",
            position: viewNodePosition,
            data: {
              expression,
              description,
            },
            draggable: true,
            selectable: true,
          });

          viewNodeIndex++;
        }
      );

      // Add view nodes to the canvas
      if (viewNodes.length > 0) {
        setNodes((currentNodes) => {
          // Remove existing view nodes first
          const nonViewNodes = currentNodes.filter(
            (node) => !node.id.startsWith("view-")
          );
          return [...nonViewNodes, ...viewNodes];
        });
      }
    }, [getNodes, setNodes]);

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

          // Don't create label node if labelDisplay is "none"
          if (variable?.labelDisplay === "none") return;

          // Only create label node if there's either a label OR a value
          const hasValue =
            variable?.value !== undefined && variable?.value !== null;
          const hasName = variable?.name;
          if (!hasValue && !hasName) return;

          // Check if this label should be visible using the same logic as LabelNode component
          const isVariableActive = executionStore.activeVariables.has(cssId);

          // If in step mode and variable is not active, skip creating this label
          if (computationStore.isStepMode() && !isVariableActive) {
            return;
          }

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

          // Use the variable node position directly (already in React Flow coordinates)
          // This avoids coordinate conversion issues and should be accurate
          const htmlElementPosition = variableNode.position;
          const htmlElementDimensions = {
            width: (variableNode.data.width as number) || 0,
            height: (variableNode.data.height as number) || 0,
          };

          const labelPos = getLabelNodePos(
            htmlElementPosition,
            htmlElementDimensions,
            formulaNode,
            {
              width: formulaNode.measured?.width || formulaNode.width || 400,
              height: formulaNode.measured?.height || formulaNode.height || 200,
            },
            existingLabels,
            getViewport()
          );

          // Add this label to existing labels for future collision detection
          const labelText = variable?.name || cssId;
          const estimatedLabelWidth = Math.max(
            labelText.length * (8 / viewport.zoom),
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

          // Create the label node - initially hidden until positioned correctly
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
            style: {
              opacity: 0, // Hide initially
              pointerEvents: "none" as const, // Disable interactions while hidden
            },
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

    // Function to adjust label positions after they're rendered and measured
    const adjustLabelPositions = useCallback(() => {
      const currentNodes = getNodes();

      const updatedNodes = currentNodes.map((node) => {
        if (!node.id.startsWith("label-") || !node.measured) {
          return node;
        }

        // Extract varId and formula index from label node ID
        const labelIdParts = node.id.split("-");
        if (labelIdParts.length < 3) return node;

        const formulaIndex = labelIdParts[1];
        const cssId = labelIdParts[2];

        // Find the corresponding variable node
        const variableNode = currentNodes.find((vNode) => {
          const varIdParts = vNode.id.split("-");
          return (
            varIdParts.length >= 4 &&
            varIdParts[0] === "variable" &&
            varIdParts[1] === formulaIndex &&
            varIdParts[2] === cssId
          );
        });

        if (!variableNode) return node;

        // Only proceed if the variable node is also measured to ensure coordinate consistency
        if (!variableNode.measured) return node;

        // Find the formula node
        const formulaNode = currentNodes.find(
          (fNode) => fNode.id === `formula-${formulaIndex}`
        );
        if (!formulaNode) return node;

        // Calculate the perfect centered position using actual measured width
        const actualLabelWidth = node.measured.width || node.width || 40;

        // Use React Flow's measured positions directly to avoid coordinate system mixing
        // Both variable and label nodes are in the same React Flow coordinate space
        let variableCenterX: number;

        if (variableNode.measured && variableNode.measured.width) {
          // Variable node is measured - use its exact center in React Flow coordinates
          const variableAbsoluteX =
            (formulaNode.position.x || 0) + (variableNode.position.x || 0);
          variableCenterX = variableAbsoluteX + variableNode.measured.width / 2;
        } else {
          // Fallback to data dimensions if not yet measured
          const variablePosition = variableNode.position;
          const variableDimensions = {
            width: (variableNode.data.width as number) || 0,
            height: (variableNode.data.height as number) || 0,
          };

          const formulaNodePos = formulaNode.position;
          const absoluteVariableX = formulaNodePos.x + variablePosition.x;
          variableCenterX = absoluteVariableX + variableDimensions.width / 2;
        }

        const perfectLabelX = variableCenterX - actualLabelWidth / 2;

        // Keep the same Y position and placement, just fix the X alignment
        // Also make the label visible now that it's positioned correctly
        return {
          ...node,
          position: {
            ...node.position,
            x: perfectLabelX,
          },
          style: {
            ...node.style,
            opacity: 1, // Make visible
            pointerEvents: "auto" as const, // Re-enable interactions
          },
        };
      });

      // Only update if there are actual changes
      const hasChanges = updatedNodes.some((node, index) => {
        const original = currentNodes[index];
        return original.position.x !== node.position.x;
      });

      if (hasChanges) {
        setNodes(updatedNodes);
      }
    }, [getNodes, getViewport, setNodes]);

    // Function to add variable nodes as subnodes using React Flow's measurement system
    const addVariableNodes = useCallback(() => {
      addVariableNodesUtil({
        getNodes,
        getViewport,
        nodesInitialized,
        setNodes,
        getPosAndDim,
        showVariableBorders,
        addLabelNodes,
        addViewNodes,
        variableNodesAddedRef,
      });
    }, [
      getNodes,
      getViewport,
      nodesInitialized,
      setNodes,
      getPosAndDim,
      showVariableBorders,
      addLabelNodes,
      addViewNodes,
    ]);

    /**
     * Function to update variable nodes or add new ones (hybrid approach)
     */
    const updateVariableNodes = useCallback(() => {
      updateVariableNodesUtil({
        getNodes,
        getViewport,
        nodesInitialized,
        setNodes,
        getPosAndDim,
        showVariableBorders,
        variableNodesAddedRef,
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
    // Only create edges after labels are positioned and visible
    useEffect(() => {
      if (nodes.length > 0) {
        // Check if all label nodes are visible (positioned correctly)
        const labelNodes = nodes.filter((node) => node.id.startsWith("label-"));
        const visibleLabelNodes = labelNodes.filter(
          (node) => !node.style || node.style.opacity !== 0
        );

        // Only create edges if all labels are visible or there are no labels
        if (
          labelNodes.length === 0 ||
          visibleLabelNodes.length === labelNodes.length
        ) {
          const newEdges = createLabelVariableEdges(nodes);
          setEdges(newEdges);
        } else {
          // Keep edges empty while labels are being positioned
          setEdges([]);
        }
      } else {
        setEdges([]);
      }
    }, [nodes, createLabelVariableEdges, setEdges]);

    // Update labels when step mode or active variables change
    useEffect(() => {
      let timeoutId: number | null = null;

      const disposer = reaction(
        () => ({
          isStepMode: computationStore.isStepMode(),
          activeVariables: Array.from(executionStore.activeVariables),
          viewDescriptions: Object.keys(executionStore.currentViewDescriptions),
        }),
        () => {
          if (nodesInitialized && variableNodesAddedRef.current) {
            // Clear any pending timeout to prevent multiple rapid updates
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            // Debounce the label update to prevent rapid recreation
            timeoutId = window.setTimeout(() => {
              // Remove existing label nodes, view nodes, and edges, then re-add with updated visibility
              setNodes((currentNodes) => {
                const nonLabelViewNodes = currentNodes.filter(
                  (node) =>
                    !node.id.startsWith("label-") &&
                    !node.id.startsWith("view-")
                );
                return nonLabelViewNodes;
              });

              // Clear edges to prevent stale edge references
              setEdges([]);

              // Re-add labels and view nodes with updated visibility after state has settled
              setTimeout(() => {
                addLabelNodes();
                addViewNodes();
              }, 100);
            }, 100); // Debounce for 100ms
          }
        }
      );

      return () => {
        disposer();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [nodesInitialized, addLabelNodes, addViewNodes, setNodes, setEdges]);

    // Adjust label positions after they're rendered and measured
    useEffect(() => {
      if (!nodesInitialized) return;

      // Check if we have label nodes that are measured
      const labelNodes = nodes.filter((node) => node.id.startsWith("label-"));
      const measuredLabelNodes = labelNodes.filter((node) => node.measured);

      // Also check that all corresponding variable nodes are measured for coordinate consistency
      const allVariableNodesMeasured = labelNodes.every((labelNode) => {
        const labelIdParts = labelNode.id.split("-");
        if (labelIdParts.length < 3) return false;

        const formulaIndex = labelIdParts[1];
        const cssId = labelIdParts[2];

        const variableNode = nodes.find((vNode) => {
          const varIdParts = vNode.id.split("-");
          return (
            varIdParts.length >= 4 &&
            varIdParts[0] === "variable" &&
            varIdParts[1] === formulaIndex &&
            varIdParts[2] === cssId
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
