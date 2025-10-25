import React, { useCallback, useEffect, useRef } from "react";

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

import { CanvasControls } from "../rendering/canvas-controls";
import FormulaNode from "../rendering/nodes/formula-node";
import LabelNode from "../rendering/nodes/label-node";
import VariableNode from "../rendering/nodes/variable-node";
import { computeEdgesForFormula } from "../rendering/util/edges";
import {
  adjustLabelPositions as adjustLabelPositionsUtil,
  processVariableElementsForLabels,
} from "../rendering/util/label-node";
import { findFormulaNodeByIndex } from "../rendering/util/misc";
import { createVariableNodesFromFormula } from "../rendering/util/variable-nodes";
import { computationStore } from "../store/computation";
import { executionStore } from "../store/execution";
import { useFormulize } from "./useFormulize";

const nodeTypes = {
  formula: FormulaNode,
  variable: VariableNode,
  label: LabelNode,
};

interface FormulaComponentProps {
  formulaId: string;
  showVariableBorders?: boolean;
  className?: string;
  style?: React.CSSProperties;
  formulaClassName?: string;
  formulaStyle?: React.CSSProperties;
  labelClassName?: string;
  labelStyle?: React.CSSProperties;
}

const FormulaCanvasInner = observer(
  ({
    formulaId,
    showVariableBorders = false,
    formulaClassName,
    formulaStyle,
    labelClassName,
    labelStyle,
  }: {
    formulaId: string;
    showVariableBorders?: boolean;
    formulaClassName?: string;
    formulaStyle?: React.CSSProperties;
    labelClassName?: string;
    labelStyle?: React.CSSProperties;
  }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const variableNodesAddedRef = useRef(false);
    const manuallyPositionedLabelsRef = useRef<Set<string>>(new Set());
    const { getNodes, getViewport, fitView } = useReactFlow();
    const nodesInitialized = useNodesInitialized();

    // Helper function to convert formulaId to index
    const getFormulaIndex = useCallback((): number | null => {
      if (!computationStore.environment?.formulas) {
        return null;
      }
      const index = computationStore.environment.formulas.findIndex(
        (f) => f.formulaId === formulaId
      );
      return index >= 0 ? index : null;
    }, [formulaId]);

    // Get the formula index at the start
    const formulaIndex = getFormulaIndex();

    // Helper function to get the formula latex from computation store
    const getFormula = useCallback((): string | null => {
      if (
        formulaIndex === null ||
        !computationStore.displayedFormulas ||
        formulaIndex < 0 ||
        formulaIndex >= computationStore.displayedFormulas.length
      ) {
        return null;
      }
      return computationStore.displayedFormulas[formulaIndex];
    }, [formulaIndex]);

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
        changes.forEach((change) => {
          if (
            change.type === "position" &&
            change.dragging &&
            change.id.startsWith("label-")
          ) {
            // Mark this label as manually positioned
            manuallyPositionedLabelsRef.current.add(change.id);
          }
        });

        onNodesChange(changes);
      },
      [onNodesChange]
    );

    // Function to add variable nodes by finding them in the rendered MathJax formula
    const addVariableNodes = useCallback(() => {
      if (formulaIndex === null) return;

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

          const formulaNode = findFormulaNodeByIndex(
            currentNodes,
            formulaIndex.toString()
          );
          if (!formulaNode || !formulaNode.measured) {
            console.log("FormulaComponent: Formula node not measured yet");
            return;
          }

          // Use helper to create variable nodes for this formula
          const variableNodes = createVariableNodesFromFormula(
            formulaElement,
            formulaNode,
            formulaIndex.toString(),
            viewport,
            showVariableBorders
          );

          // Add all nodes if we found any variables
          if (variableNodes.length > 0) {
            setNodes((currentNodes) => {
              // Remove existing variable and label nodes
              const nonVariableNodes = currentNodes.filter(
                (node) =>
                  !node.id.startsWith("variable-") &&
                  !node.id.startsWith("label-")
              );

              // Combine nodes for processing
              const nodesWithVariables = [
                ...nonVariableNodes,
                ...variableNodes,
              ];

              // Use helper to create label nodes and get variable node updates
              const { labelNodes, variableNodeUpdates } =
                processVariableElementsForLabels(
                  formulaElement,
                  formulaNode,
                  formulaIndex,
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
            // Re-fit view after a delay to ensure everything is positioned
            setTimeout(() => {
              fitView({ padding: 0.2 });
            }, 150);
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
    }, [
      getNodes,
      getViewport,
      nodesInitialized,
      showVariableBorders,
      formulaIndex,
      setNodes,
      fitView,
    ]);

    // Initialize the canvas with the formula node
    useEffect(() => {
      const initializeCanvas = async () => {
        if (formulaIndex === null) {
          console.warn(`Formula not found with id: ${formulaId}`);
          return;
        }

        // Wait for MathJax to be ready
        if (window.MathJax) {
          await window.MathJax.startup.promise;
        }

        // Get the formula latex
        const latex = getFormula();
        if (!latex) {
          console.warn(
            `No formula found at index ${formulaIndex} in displayedFormulas`
          );
          return;
        }

        // Create the main formula node
        const formulaNode: Node = {
          id: `formula-${formulaIndex}`,
          type: "formula",
          position: { x: 100, y: 100 },
          data: {
            latex: latex,
            environment: {
              fontSize: computationStore.environment?.fontSize || 1,
              computation: {
                mode: computationStore.computationEngine,
              },
            },
            className: formulaClassName,
            style: formulaStyle,
          },
        };

        setNodes([formulaNode]);
        setEdges([]);
      };

      initializeCanvas();
    }, [
      getFormula,
      formulaIndex,
      formulaId,
      setNodes,
      setEdges,
      formulaClassName,
      formulaStyle,
    ]);

    // Add variable nodes when React Flow nodes are initialized and measured
    useEffect(() => {
      if (nodesInitialized && !variableNodesAddedRef.current) {
        addVariableNodes();
      }
    }, [nodesInitialized, addVariableNodes]);

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

    // Adjust label positions after they're rendered and measured
    useEffect(() => {
      if (!nodesInitialized) return;

      // Check if we have label nodes that are measured
      const labelNodes = nodes.filter((node) => node.id.startsWith("label-"));
      if (labelNodes.length === 0) return;

      const measuredLabelNodes = labelNodes.filter((node) => node.measured);

      // Also check that all corresponding variable nodes are measured
      const allVariableNodesMeasured = labelNodes.every((labelNode) => {
        const labelIdParts = labelNode.id.split("-");
        if (labelIdParts.length < 3) return false;

        const formulaIdx = labelIdParts[1];
        const cssId = labelIdParts[2];

        const variableNode = nodes.find((vNode) => {
          const varIdParts = vNode.id.split("-");
          return (
            varIdParts.length >= 4 &&
            varIdParts[0] === "variable" &&
            varIdParts[1] === formulaIdx &&
            varIdParts[2] === cssId
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
        }, 50);

        return () => clearTimeout(timeoutId);
      }
    }, [nodes, nodesInitialized, adjustLabelPositions]);

    // Create edges after labels are visible and positioned
    useEffect(() => {
      if (formulaIndex === null) return;

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
          const variableNodes = nodes.filter((node) =>
            node.id.startsWith("variable-")
          );
          const formulaNodes = nodes.filter((node) =>
            node.id.startsWith("formula-")
          );

          const computedEdges = computeEdgesForFormula(
            formulaIndex.toString(),
            labelNodes,
            variableNodes,
            formulaNodes,
            shouldLabelBeVisible,
            new Set()
          );

          // Preserve object identity for unchanged edges to avoid re-renders
          const nextEdges = computedEdges
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

          // Shallow reference equality check to skip unnecessary setEdges
          const sameByRef =
            nextEdges.length === edges.length &&
            nextEdges.every((e, i) => e === edges[i]);
          if (!sameByRef) {
            setEdges(nextEdges);
          }
        } else {
          // Keep edges empty while labels are being positioned
          setEdges([]);
        }
      } else {
        setEdges([]);
      }
    }, [nodes, edges, formulaIndex, shouldLabelBeVisible, setEdges]);

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
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            color="#ffffff"
          />
          <CanvasControls />
        </ReactFlow>
      </div>
    );
  }
);

export const FormulaComponent: React.FC<FormulaComponentProps> = observer(
  ({
    formulaId,
    showVariableBorders = false,
    className = "",
    style = {},
    formulaClassName,
    formulaStyle,
    labelClassName,
    labelStyle,
  }) => {
    const { instance, isLoading } = useFormulize();
    const containerStyle: React.CSSProperties = {
      width: "100%",
      height: style.height || "auto",
      border: "1px solid #e2e8f0",
      borderRadius: "0.5rem",
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
          <FormulaCanvasInner
            formulaId={formulaId}
            showVariableBorders={showVariableBorders}
            formulaClassName={formulaClassName}
            formulaStyle={formulaStyle}
            labelClassName={labelClassName}
            labelStyle={labelStyle}
          />
        </ReactFlowProvider>
      </div>
    );
  }
);

export default FormulaComponent;
