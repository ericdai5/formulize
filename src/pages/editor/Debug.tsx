import styled from "@emotion/styled";

import { observer } from "mobx-react-lite";

import {
  debugStore,
  formulaStore,
  selectionStore,
  undoStore,
} from "../../store";

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
      <div className="bottom-2 right-2 absolute z-1000 py-1 px-2 border flex items-center border-slate-200 rounded-md bg-white">
        <input
          id="showDebug"
          className="mr-2"
          type="checkbox"
          checked={debugStore.showDebugPanel}
          onChange={(e) => {
            debugStore.setShowDebugPanel(e.target.checked);
          }}
        />
        <label className="user-select-none text-sm" htmlFor="showDebug">
          Debug
        </label>
      </div>
      {debugStore.showDebugPanel && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
          className="absolute top-0 right-0 p-2 max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden flex flex-col bg-white/80"
        >
          <DebugOptions />
          <History />
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
        className="mr-2"
        type="checkbox"
        checked={debugStore.showAlignGuides}
        onChange={(e) => {
          debugStore.setShowAlignGuides(e.target.checked);
        }}
      />
      <label className="user-select-none" htmlFor="showAlign">
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
    <table className="font-mono">
      <thead className="font-bold">
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

const History = observer(() => (
  <>
    <pre>History entries: {undoStore.history.length}</pre>
    <pre>History index: {undoStore.currentIdx}</pre>
  </>
));
