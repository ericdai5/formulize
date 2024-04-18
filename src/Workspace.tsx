import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { Global, css } from "@emotion/react";

import { SelectionStore, selectionStore } from "./store";
import { RenderedFormula } from "./RenderedFormula";
import { Debug } from "./Debug";
import { Menu, ContextMenu } from "./Menu";

export const Workspace = observer(() => {
  const [showTopMenu, setShowTopMenu] = useState(true);
  console.log("Workspace render");

  const [contextMenuAnchor, setContextMenuAnchor] = useState<{
    anchorX: number;
    anchorY: number;
  } | null>(null);

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
      onDoubleClick={(e) => {
        selectionStore.clearSelection();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        selectionStore.startDragSelection(e.clientX, e.clientY);
        e.preventDefault();
      }}
      onMouseMove={(e) => {
        selectionStore.updateDragSelection(e.clientX, e.clientY);
        e.preventDefault();
      }}
      onMouseUp={(e) => {
        selectionStore.stopDragSelection();
        e.preventDefault();
      }}
      onClick={(e) => {
        if (contextMenuAnchor !== null) {
          setContextMenuAnchor(null);
        }
      }}
      onContextMenu={(e) => {
        if (!showTopMenu) {
          setContextMenuAnchor({ anchorX: e.clientX, anchorY: e.clientY });
        }
        e.preventDefault();
      }}
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
      {selectionStore.selectionRect ? (
        <div
          css={css`
            position: absolute;
            border: 1px solid black;
            background-color: rgba(0, 0, 0, 0.1);
            z-index: 1000;
            pointer-events: none;
            left: ${selectionStore.selectionRectDimensions.left}px;
            top: ${selectionStore.selectionRectDimensions.top}px;
            width: ${selectionStore.selectionRectDimensions.width}px;
            height: ${selectionStore.selectionRectDimensions.height}px;
          `}
        ></div>
      ) : null}
      <RenderedFormula />
      <Debug />
    </div>
  );
});
