import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { Global, css } from "@emotion/react";

import { SelectionStore, selectionStore } from "./store";
import { RenderedFormula } from "./RenderedFormula";
import { Debug } from "./Debug";
import { Menu } from "./Menu";
import { populateFormulaStore } from "./mathjax";

window.populateFormulaStore = populateFormulaStore;

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
    >
      <Menu />
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
