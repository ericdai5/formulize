import { css } from "@emotion/react";
import { observer } from "mobx-react-lite";

import { selectionStore } from "./store";

function formatCoordinate(n: number) {
  return Math.round(n).toString().padStart(3, " ");
}

export const Debug = observer(() => {
  return (
    <div
      css={css`
        position: absolute;
        top: 0;
        right: 0;
        padding: 1rem;
      `}
    >
      <pre>Targets:</pre>
      {Array.from(selectionStore.targets.values()).map((target) => (
        <pre key={target.id}>
          {target.id.padStart(5, " ")}: {formatCoordinate(target.left)},{" "}
          {formatCoordinate(target.top)} - {formatCoordinate(target.width)} x{" "}
          {formatCoordinate(target.height)}
        </pre>
      ))}
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
      <pre>{selectionStore.currentlyDragged.join(", ")}</pre>
      <pre>Selection:</pre>
      <pre>{selectionStore.selected.join(", ")}</pre>
    </div>
  );
});
