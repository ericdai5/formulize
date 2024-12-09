import { css } from "@emotion/react";
import {
  MouseEvent,
  WheelEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { observer } from "mobx-react-lite";

import { AlignmentGuides } from "./AlignmentGuides";
import { Debug } from "./Debug";
import { RenderedFormula } from "./RenderedFormula";
import { editingStore, selectionStore, formulaStore } from "./store";
import VariableTooltip from './VariableTooltip';
import { computationStore } from './computation'
import { MathSymbol } from './FormulaTree';

export const Workspace = observer(() => {
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [dragState, setDragState] = useState<
    | { state: "none" }
    | { state: "leftdown"; x: number; y: number }
    | { state: "selecting" }
    | { state: "panning"; lastX: number; lastY: number }
  >({ state: "none" });

  const getActiveVariable = useCallback(() => {
    if (!editingStore.showEnlivenMode) return null;
    
    const selections = selectionStore.siblingSelections;
    if (selections.length !== 1 || selections[0].length !== 1) return null;

    const selectedId = selections[0][0];
    const node = formulaStore.augmentedFormula.findNode(selectedId);
    
    if (!node || node.type !== 'symbol') return null;
    
    const symbol = (node as MathSymbol).value;
    return {
      id: `var-${symbol}`,
      symbol,
      selectedId
    };
  }, []);
  
  // Clear selection when enliven mode is turned off
  useEffect(() => {
    if (!editingStore.showEnlivenMode) {
      selectionStore.clearSelection();
    }
  }, [editingStore.showEnlivenMode]);

  const handleDoubleClick = useCallback((_: MouseEvent<HTMLDivElement>) => {
    selectionStore.clearSelection();
  }, []);
  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      setDragState({ state: "leftdown", x: e.clientX, y: e.clientY });
    } else if (e.button === 1) {
      setDragState({ state: "panning", lastX: e.clientX, lastY: e.clientY });
    }
  }, []);
  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (dragState.state === "leftdown") {
        selectionStore.startDragSelection(dragState.x, dragState.y);
        selectionStore.updateDragSelection(e.clientX, e.clientY);
        setDragState({ state: "selecting" });
      } else if (dragState.state === "selecting") {
        selectionStore.updateDragSelection(e.clientX, e.clientY);
      } else if (dragState.state === "panning") {
        // Update pan
        const dx = e.clientX - dragState.lastX;
        const dy = e.clientY - dragState.lastY;
        selectionStore.updatePan(dx, dy);
        setDragState({ state: "panning", lastX: e.clientX, lastY: e.clientY });
      }
    },
    [dragState, setDragState]
  );
  const handleMouseUp = useCallback(
    (_: MouseEvent<HTMLDivElement>) => {
      if (dragState.state === "selecting") {
        selectionStore.stopDragSelection();
      }
      setDragState({ state: "none" });
    },
    [dragState, setDragState]
  );
  const handleScroll = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    selectionStore.updateZoom(-e.deltaY);
  }, []);
  const handleSetRef = useCallback((ref: Element | null) => {
    selectionStore.initializeWorkspace(ref);
  }, []);

  useEffect(() => {
    const resizeHandler = () => {
      selectionStore.updateWorkspaceDimensions();
    };
    window.addEventListener("resize", resizeHandler);

    () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  const getTooltipPosition = useCallback(() => {
    if (!selectionStore.workspaceBBox) return null;

    const selections = selectionStore.siblingSelections;
    if (selections.length !== 1 || selections[0].length !== 1) return null;

    const selectedId = selections[0][0];
    const target = selectionStore.screenSpaceTargets.get(selectedId);
    
    if (!target) return null;

    return {
      x: target.left - selectionStore.workspaceBBox.left + (target.width / 2),
      y: target.top - selectionStore.workspaceBBox.top
    };
  }, []);

  // Get current variable type for tooltip
  const getCurrentVariableType = useCallback(() => {
    const activeVar = getActiveVariable();
    if (!activeVar) return 'none';
    
    return computationStore.variables.get(activeVar.id)?.type || 'none';
  }, [getActiveVariable]);

  const handleVariableTypeSelect = useCallback((type: 'fixed' | 'slidable' | 'dependent') => {
    const activeVar = getActiveVariable();
    if (!activeVar) return;

    console.log("🔍 Setting variable type:", { id: activeVar.id, symbol: activeVar.symbol, type });
    
    computationStore.addVariable(activeVar.id, activeVar.symbol);
    computationStore.setVariableType(activeVar.id, type);
    
    // Only keep selection for fixed variables
    if (type !== 'fixed') {
      selectionStore.clearSelection();
    }
  }, [getActiveVariable]);

  return (
    <div
      css={css`
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      `}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleScroll}
      ref={handleSetRef}
    >
      <SelectionRect />
      <SelectionBorders />
      <AlignmentGuides />
      <RenderedFormula />
      
      {/* Tooltip Container */}
      <div css={css`
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      `}>
        {editingStore.showEnlivenMode && getActiveVariable() && (
          <VariableTooltip 
            position={getTooltipPosition() || {x: 0, y: 0}}
            onSelect={handleVariableTypeSelect}
            currentType={getCurrentVariableType()}
            id={getActiveVariable()?.id || ''}
          />
        )}
      </div>
      <Debug />
    </div>
  );
});

export default Workspace;
              
const SelectionRect = observer(() => {
  if (!selectionStore.selectionRectDimensions) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        border: "1px solid black",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        zIndex: "1000",
        pointerEvents: "none",
        left: `${selectionStore.selectionRectDimensions.left}px`,
        top: `${selectionStore.selectionRectDimensions.top}px`,
        width: `${selectionStore.selectionRectDimensions.width}px`,
        height: `${selectionStore.selectionRectDimensions.height}px`,
      }}
    ></div>
  );
});

const SELECTION_PADDING = 0.4;

const SelectionBorders = observer(() => {
  return (
    <>
      {Array.from(selectionStore.siblingSelections).map((range) => {
        const leftEdge = Math.min(
          ...range.map(
            (id) => selectionStore.screenSpaceTargets.get(id)?.left ?? 0
          )
        );
        const rightEdge = Math.max(
          ...range.map(
            (id) =>
              (selectionStore.screenSpaceTargets.get(id)?.left ?? 0) +
              (selectionStore.screenSpaceTargets.get(id)?.width ?? 0)
          )
        );
        const topEdge = Math.min(
          ...range.map(
            (id) => selectionStore.screenSpaceTargets.get(id)?.top ?? 0
          )
        );
        const bottomEdge = Math.max(
          ...range.map(
            (id) =>
              (selectionStore.screenSpaceTargets.get(id)?.top ?? 0) +
              (selectionStore.screenSpaceTargets.get(id)?.height ?? 0)
          )
        );
        const width = rightEdge - leftEdge;
        const height = bottomEdge - topEdge;

        const { left, top } = selectionStore.workspaceBBox!;
        return (
          <div
            style={{
              position: "absolute",
              left: `calc(${leftEdge - left}px - ${SELECTION_PADDING}rem)`,
              top: `calc(${topEdge - top}px - ${SELECTION_PADDING}rem)`,
              width: `calc((${width}px + ${2 * SELECTION_PADDING}rem)`,
              height: `calc(${height}px + ${2 * SELECTION_PADDING}rem)`,
              border: "2px dashed black",
              zIndex: "1000",
            }}
            key={range.join(",")}
          ></div>
        );
      })}
    </>
  );
});

export const EnlivenMode = observer(() => {
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  
  useEffect(() => {
    if (editingStore.showEnlivenMode && selectionStore.siblingSelections.length > 0) {
      const selection = selectionStore.siblingSelections[0];
      if (selection && selection.length > 0 && selectionStore.workspaceBBox) {
        const target = selectionStore.screenSpaceTargets.get(selection[0]);
        if (target) {
          setTooltipPosition({
            x: target.left - selectionStore.workspaceBBox.left,
            y: target.top - selectionStore.workspaceBBox.top
          });
        }
      }
    } else {
      setTooltipPosition(null);
    }
  }, [editingStore.showEnlivenMode, selectionStore.siblingSelections]);

  const getCurrentVariableId = () => {
    const selection = selectionStore.siblingSelections[0]?.[0];
    if (!selection) return null;
    
    const node = formulaStore.augmentedFormula.findNode(selection);
    if (!node || node.type !== 'symbol') return null;
    
    return `var-${(node as MathSymbol).value}`;
  };

  const handleVariableTypeSelect = (type: 'fixed' | 'slidable' | 'dependent') => {
    const selection = selectionStore.siblingSelections[0]?.[0];
    if (!selection) return;

    const node = formulaStore.augmentedFormula.findNode(selection);
    if (node?.type === 'symbol') {
      const symbol = (node as MathSymbol).value;
      const id = `var-${symbol}`;
      console.log('Setting variable type:', { id, symbol, type });
      computationStore.addVariable(id, symbol);
      computationStore.setVariableType(id, type);
      
      if (type === 'fixed') {
        setSelectedVar(id);
      } else {
        setSelectedVar(null);
        selectionStore.clearSelection();
      }
    }
  };
  
  if (!tooltipPosition) return null;

  const variableId = selectedVar || getCurrentVariableId();
  if (!variableId) return null;

  return (
    <VariableTooltip
      position={tooltipPosition}
      onSelect={handleVariableTypeSelect}
      currentType={computationStore.variables.get(variableId)?.type || 'none'}
      id={variableId}
    />
  );
});