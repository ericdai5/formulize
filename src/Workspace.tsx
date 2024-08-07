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
import { selectionStore } from "./store";

export const Workspace = observer(() => {
  const [dragState, setDragState] = useState<
    | { state: "none" }
    | { state: "leftdown"; x: number; y: number }
    | { state: "selecting" }
    | { state: "panning"; lastX: number; lastY: number }
  >({ state: "none" });

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

  return (
    <div
      css={css`
        width: 100%;
        height: 100%;
        position: relative;

        /* TODO: Temporary, work out actual formula box placement */
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
      <Debug />
    </div>
  );
});

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
      {Array.from(selectionStore.resolvedSelection).map((id) => {
        const target = selectionStore.screenSpaceTargets.get(id);
        if (!target) {
          return null;
        }
        const { left, top } = selectionStore.workspaceBBox!;
        return (
          <div
            style={{
              position: "absolute",
              left: `calc(${target.left - left}px - ${SELECTION_PADDING}rem)`,
              top: `calc(${target.top - top}px - ${SELECTION_PADDING}rem)`,
              width: `calc((${target.width}px + ${2 * SELECTION_PADDING}rem)`,
              height: `calc(${target.height}px + ${2 * SELECTION_PADDING}rem)`,
              border: "2px dashed black",
              zIndex: "1000",
            }}
            key={id}
          ></div>
        );
      })}
    </>
  );
});
