import { css } from "@emotion/react";
import { MouseEvent, useCallback, useState } from "react";

import { observer } from "mobx-react-lite";

import { Debug } from "./Debug";
import { ContextMenu, Menu } from "./Menu";
import { RenderedFormula } from "./RenderedFormula";
import { selectionStore } from "./store";

export const Workspace = observer(() => {
  const [showTopMenu, setShowTopMenu] = useState(true);

  const [contextMenuAnchor, setContextMenuAnchor] = useState<{
    anchorX: number;
    anchorY: number;
  } | null>(null);

  const handleDoubleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    selectionStore.clearSelection();
    e.preventDefault();
  }, []);
  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    selectionStore.startDragSelection(e.clientX, e.clientY);
    e.preventDefault();
  }, []);
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (selectionStore.isDragging) {
      selectionStore.updateDragSelection(e.clientX, e.clientY);
    }
    e.preventDefault();
  }, []);
  const handleMouseUp = useCallback((e: MouseEvent<HTMLDivElement>) => {
    selectionStore.stopDragSelection();
    e.preventDefault();
  }, []);
  const handleContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!showTopMenu) {
        setContextMenuAnchor({ anchorX: e.clientX, anchorY: e.clientY });
      }
      e.preventDefault();
    },
    [showTopMenu, setContextMenuAnchor]
  );

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
      `}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
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
