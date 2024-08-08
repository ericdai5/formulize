import { css } from "@emotion/react";
import styled from "@emotion/styled";

import { observer } from "mobx-react-lite";

import { debugStore, formulaStore, selectionStore } from "./store";

function formatCoordinate(n: number) {
  return Math.round(n).toString().padStart(3, " ");
}

const CoordinateCell = styled.td`
  text-align: right;
  padding-right: 1rem;
`;

export const Debug = observer(() => {
  return (
    <>
      <div
        css={css`
          position: fixed;
          top: 2rem;
          right: 1rem;
          z-index: 1000;
        `}
      >
        <input
          id="showDebug"
          css={css`
            margin-right: 0.5rem;
          `}
          type="checkbox"
          checked={debugStore.showDebugPanel}
          onChange={(e) => {
            debugStore.setShowDebugPanel(e.target.checked);
          }}
        />
        <label
          css={css`
            user-select: none;
            font-family: monospace;
          `}
          htmlFor="showDebug"
        >
          Show debug menu
        </label>
      </div>
      {debugStore.showDebugPanel && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
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
            background: rgba(255, 255, 255, 0.8);
          `}
        >
          <DebugOptions />
          <Viewport />
          <Targets />
          <Drag />
          <Selected />
          <AlignGuides />
        </div>
      )}
    </>
  );
});

const DebugOptions = observer(() => (
  <>
    <span>
      <input
        id="showAlign"
        css={css`
          margin-right: 0.5rem;
        `}
        type="checkbox"
        checked={debugStore.showAlignGuides}
        onChange={(e) => {
          debugStore.setShowAlignGuides(e.target.checked);
        }}
      />
      <label
        css={css`
          user-select: none;
          font-family: monospace;
        `}
        htmlFor="showAlign"
      >
        Show alignment guides
      </label>
    </span>
  </>
));

const Viewport = observer(() => (
  <>
    <pre>
      Pan: {selectionStore.pan.x}, {selectionStore.pan.y}
    </pre>
    <pre>Zoom: {selectionStore.zoom}</pre>
  </>
));

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
          <CoordinateCell>Type</CoordinateCell>
          <CoordinateCell>Left</CoordinateCell>
          <CoordinateCell>Top</CoordinateCell>
          <CoordinateCell>Width</CoordinateCell>
          <CoordinateCell>Height</CoordinateCell>
        </tr>
      </thead>
      <tbody>
        {Array.from(selectionStore.screenSpaceTargets.values())
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((target) => (
            <tr key={target.id}>
              <CoordinateCell>{target.id}</CoordinateCell>
              <CoordinateCell>
                {formulaStore.augmentedFormula.findNode(target.id)?.type}
              </CoordinateCell>
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
    <pre>Sibling resolved selection:</pre>
    <pre>
      {Array.from(selectionStore.siblingSelections)
        .map((range) => range.join(", "))
        .join("\n")}
    </pre>
  </>
));

const AlignGuides = observer(() =>
  debugStore.alignDragState ? (
    <>
      <pre>Alignment drag row: {debugStore.alignDragState.row}</pre>
      <pre>Alignment drag col: {debugStore.alignDragState.col}</pre>
      <pre>
        Alignment drag target:{" "}
        {debugStore.alignDragState.currentDropTargetId ?? "none"}
      </pre>
    </>
  ) : (
    <pre>Alignment drag: none</pre>
  )
);
