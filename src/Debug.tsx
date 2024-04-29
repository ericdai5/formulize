import { css } from "@emotion/react";
import styled from "@emotion/styled";

import { observer } from "mobx-react-lite";

import { selectionStore } from "./store";

function formatCoordinate(n: number) {
  return Math.round(n).toString().padStart(3, " ");
}

const CoordinateCell = styled.td`
  text-align: right;
  padding-right: 1rem;
`;

export const Debug = observer(() => {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      css={css`
        position: fixed;
        top: 2rem;
        right: 0;
        padding: 1rem;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
      `}
    >
      <Targets />
      <Drag />
      <Selected />
    </div>
  );
});

const Targets = observer(() => (
  <>
    <pre>Targets:</pre>
    <table
      css={css`
        font-family: monospace;
      `}
    >
      <thead
        css={css`
          font-weight: bold;
        `}
      >
        <tr>
          <CoordinateCell>Id</CoordinateCell>
          <CoordinateCell>Left</CoordinateCell>
          <CoordinateCell>Top</CoordinateCell>
          <CoordinateCell>Width</CoordinateCell>
          <CoordinateCell>Height</CoordinateCell>
        </tr>
      </thead>
      <tbody>
        {Array.from(selectionStore.targets.values()).map((target) => (
          <tr key={target.id}>
            <CoordinateCell>{target.id}</CoordinateCell>
            <CoordinateCell>{formatCoordinate(target.left)}</CoordinateCell>
            <CoordinateCell>{formatCoordinate(target.top)}</CoordinateCell>
            <CoordinateCell>{formatCoordinate(target.width)}</CoordinateCell>
            <CoordinateCell>{formatCoordinate(target.height)}</CoordinateCell>
          </tr>
        ))}
      </tbody>
    </table>
  </>
));

const Drag = observer(() => (
  <>
    <pre>Selection rect:</pre>
    {selectionStore.selectionRect ? (
      <>
        <pre>{"x1: " + selectionStore.selectionRect.x1}</pre>
        <pre>{"y1: " + selectionStore.selectionRect.y1}</pre>
        <pre>{"x2: " + selectionStore.selectionRect.x2}</pre>
        <pre>{"y2: " + selectionStore.selectionRect.y2}</pre>
      </>
    ) : (
      <pre>None</pre>
    )}
    <pre>Drag selection:</pre>
    <pre>{Array.from(selectionStore.currentlyDragged).join(",\n")}</pre>
  </>
));

const Selected = observer(() => (
  <>
    <pre>Selection:</pre>
    <pre>{selectionStore.selected.join(",\n")}</pre>
    <pre>Resolved selection:</pre>
    <pre>{Array.from(selectionStore.resolvedSelection).join(",\n")}</pre>
  </>
));
