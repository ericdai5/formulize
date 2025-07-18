import { useCallback, useEffect } from "react";

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
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize, Minus, Plus } from "lucide-react";

import { computationStore } from "../api/computation";
import { FormulaStore } from "../store/FormulaStoreManager";
import { IControls } from "../types/control";
import { IEnvironment } from "../types/environment";
import { nodeTypes } from "./node";

// Custom Controls Component
const CustomControls = () => {
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
};


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
    nodeTypes = {},
  }: CanvasProps = {}) => {
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

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, , onEdgesChange] = useEdgesState<Edge>([]);

    // Update nodes when formulas or controls change
    useEffect(() => {
      const disposer = reaction(
        () => ({
          displayedFormulas: computationStore.displayedFormulas,
          formulaStore: formulaStore?.latexWithoutStyling,
          controls: controls,
        }),
        () => {
          setNodes(createNodes());
        }
      );

      // Initial setup
      setNodes(createNodes());

      return () => disposer();
    }, [createNodes, setNodes, formulaStore, controls]);

    return (
      <div className="w-full h-full min-h-[500px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
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
      <CanvasFlow {...props} nodeTypes={nodeTypes} />
    </ReactFlowProvider>
  );
});

export type { CanvasProps };
export default Canvas;
