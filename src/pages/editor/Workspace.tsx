import { MouseEvent, useCallback, useEffect, useState } from "react";

import { observer } from "mobx-react-lite";

import { AlignmentGuides } from "../../AlignmentGuides";
import { MathSymbol } from "../../FormulaTree";
import { computationStore } from "../../api/computation";
import { editingStore, formulaStore, selectionStore } from "../../store";
import { RenderedFormula } from "./RenderedFormula";
import VariableTooltip from "./VariableTooltip";

export const Workspace = observer(() => {
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

    if (!node || node.type !== "symbol") return null;

    const symbol = (node as MathSymbol).value;
    return {
      id: symbol,
      symbol,
      selectedId,
    };
  }, []);

  // Clear selection when enliven mode is turned off
  useEffect(() => {
    if (!editingStore.showEnlivenMode) {
      selectionStore.clearSelection();
    }
  }, []);

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
      x: target.left - selectionStore.workspaceBBox.left + target.width / 2,
      y: target.top - selectionStore.workspaceBBox.top,
    };
  }, []);

  // Get current variable type for tooltip
  const getCurrentVariableType = useCallback(() => {
    const activeVar = getActiveVariable();
    if (!activeVar) return "none";

    return computationStore.variables.get(activeVar.id)?.type || "none";
  }, [getActiveVariable]);

  const handleVariableTypeSelect = useCallback(
    (type: "constant" | "input" | "dependent") => {
      const activeVar = getActiveVariable();
      if (!activeVar) return;
      computationStore.addVariable(activeVar.id, activeVar.symbol);
      computationStore.setVariableType(activeVar.id, type);
      // Only keep selection for constant variables
      if (type !== "constant") {
        selectionStore.clearSelection();
      }
    },
    [getActiveVariable]
  );

  return (
    <div
      className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      ref={handleSetRef}
    >
      <SelectionRect />
      <SelectionBorders />
      <AlignmentGuides />
      <RenderedFormula />
      {/* Tooltip Container */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {editingStore.showEnlivenMode && getActiveVariable() && (
          <VariableTooltip
            position={getTooltipPosition() || { x: 0, y: 0 }}
            onSelect={handleVariableTypeSelect}
            currentType={getCurrentVariableType()}
            id={getActiveVariable()?.id || ""}
          />
        )}
      </div>
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
      className="absolute z-[1000] pointer-events-none border border-black bg-black/10"
      style={{
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
            className="absolute z-[1000] border-2 border-dashed border-slate-500 rounded-md"
            style={{
              left: `calc(${leftEdge - left}px - ${SELECTION_PADDING}rem)`,
              top: `calc(${topEdge - top}px - ${SELECTION_PADDING}rem)`,
              width: `calc(${width}px + ${2 * SELECTION_PADDING}rem)`,
              height: `calc(${height}px + ${2 * SELECTION_PADDING}rem)`,
            }}
            key={range.join(",")}
          ></div>
        );
      })}
    </>
  );
});

export const EnlivenMode = observer(() => {
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);

  useEffect(() => {
    if (
      editingStore.showEnlivenMode &&
      selectionStore.siblingSelections.length > 0
    ) {
      const selection = selectionStore.siblingSelections[0];
      if (selection && selection.length > 0 && selectionStore.workspaceBBox) {
        const target = selectionStore.screenSpaceTargets.get(selection[0]);
        if (target) {
          setTooltipPosition({
            x: target.left - selectionStore.workspaceBBox.left,
            y: target.top - selectionStore.workspaceBBox.top,
          });
        }
      }
    } else {
      setTooltipPosition(null);
    }
  }, []);

  const getCurrentVariableId = () => {
    const selection = selectionStore.siblingSelections[0]?.[0];
    if (!selection) return null;

    const node = formulaStore.augmentedFormula.findNode(selection);
    if (!node || node.type !== "symbol") return null;

    return (node as MathSymbol).value;
  };

  const handleVariableTypeSelect = (
    type: "constant" | "input" | "dependent"
  ) => {
    const selection = selectionStore.siblingSelections[0]?.[0];
    if (!selection) return;

    const node = formulaStore.augmentedFormula.findNode(selection);
    if (node?.type === "symbol") {
      const symbol = (node as MathSymbol).value;
      const id = symbol;
      computationStore.addVariable(id, symbol);
      computationStore.setVariableType(id, type);

      if (type === "constant") {
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
      currentType={computationStore.variables.get(variableId)?.type || "none"}
      id={variableId}
    />
  );
});
