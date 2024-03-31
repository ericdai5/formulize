import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { Global, css } from "@emotion/react";

import { SelectionStore, selectionStore } from "./store";

export const Workspace = observer(() => {
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
    >
      {"Hello?"}
      {selectionStore.selectionRect ? (
        <div
          css={css`
            position: absolute;
            border: 1px solid black;
            background-color: rgba(0, 0, 0, 0.1);
            z-index: 1000;
            pointer-events: none;
            left: ${selectionStore.selectionRectLeft}px;
            top: ${selectionStore.selectionRectTop}px;
            width: ${selectionStore.selectionRectWidth}px;
            height: ${selectionStore.selectionRectHeight}px;
          `}
        ></div>
      ) : null}
    </div>
  );
});
