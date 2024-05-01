import { css } from "@emotion/react";
import { MouseEvent, useCallback, useEffect, useState } from "react";

import { observer } from "mobx-react-lite";

import { Debug } from "./Debug";
import { ContextMenu, Menu } from "./Menu";
import { RenderedFormula } from "./RenderedFormula";
import { selectionStore } from "./store";

export const Workspace = observer(() => {
  const [showTopMenu, setShowTopMenu] = useState(true);
  const [dragState, setDragState] = useState<
    | { state: "none" }
    | { state: "leftdown"; x: number; y: number }
    | { state: "selecting" }
    | { state: "panning"; lastX: number; lastY: number }
  >({ state: "none" });

  const [contextMenuAnchor, setContextMenuAnchor] = useState<{
    anchorX: number;
    anchorY: number;
  } | null>(null);

  const handleDoubleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
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
    (e: MouseEvent<HTMLDivElement>) => {
      if (dragState.state === "selecting") {
        selectionStore.stopDragSelection();
      }
      setDragState({ state: "none" });
    },
    [dragState, setDragState]
  );
  const handleContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!showTopMenu) {
        setContextMenuAnchor({ anchorX: e.clientX, anchorY: e.clientY });
      }
      e.preventDefault();
    },
    [showTopMenu, setContextMenuAnchor]
  );
  const handleScroll = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    selectionStore.updateZoom(-e.deltaY);
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
      onContextMenu={handleContextMenu}
      onWheel={handleScroll}
      ref={(ref) => selectionStore.initializeWorkspace(ref)}
    >
      <div
        css={css`
          position: absolute;
          top: 2rem;
          left: 1rem;
        `}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <input
          id="showTopMenu"
          css={css`
            margin-right: 0.5rem;
          `}
          type="checkbox"
          checked={showTopMenu}
          onChange={(e) => setShowTopMenu(e.target.checked)}
        />
        <label
          css={css`
            user-select: none;
          `}
          htmlFor="showTopMenu"
        >
          Show top menu
        </label>
      </div>
      {showTopMenu && <Menu />}
      {!showTopMenu && contextMenuAnchor !== null && (
        <ContextMenu {...contextMenuAnchor} />
      )}
      <SelectionRect />
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
