import { Fragment, useState } from "react";

import { observer } from "mobx-react-lite";

import { DimensionBox, formulaStore, selectionStore } from "./store";

export const AlignmentGuides = observer(() => {
  const [dragState, setDragState] = useState<{
    markerRow: number;
    markerCol: number;
    x: number;
  } | null>(null);

  const alignTargets = formulaStore.alignIds?.map((rowIds) =>
    rowIds
      .map((rowId) => selectionStore.screenSpaceTargets.get(rowId))
      .filter(
        (target): target is { id: string } & DimensionBox =>
          target !== undefined
      )
  );

  if (selectionStore.workspaceBBox === null || alignTargets === undefined) {
    return null;
  }

  const { left, top } = selectionStore.workspaceBBox;

  const lastMarkerLeft = Math.max(
    ...alignTargets.flatMap((rowTargets) => {
      const lastTarget = rowTargets[rowTargets.length - 1];
      return lastTarget !== undefined
        ? [lastTarget.left + lastTarget.width - left]
        : [];
    })
  );

  let dragTarget: number | null = null;
  if (dragState) {
    const rowInternalTargets =
      formulaStore.alignRowInternalTargets![dragState.markerRow];
    const leftmost = selectionStore.screenSpaceTargets.get(
      rowInternalTargets[0].id
    )!;
    const rightmost = selectionStore.screenSpaceTargets.get(
      rowInternalTargets[rowInternalTargets.length - 1].id
    )!;
    if (dragState.x < leftmost.left - left) {
      dragTarget = leftmost.left - left;
    } else if (dragState.x > rightmost.left + rightmost.width - left) {
      dragTarget = rightmost.left + rightmost.width - left;
    } else {
      for (let i = 0; i < rowInternalTargets.length - 2; i++) {
        const leftTarget = selectionStore.screenSpaceTargets.get(
          rowInternalTargets[i].id
        )!;
        const rightTarget = selectionStore.screenSpaceTargets.get(
          rowInternalTargets[i + 1].id
        )!;
        const intervalWidth = rightTarget.left - leftTarget.left;
        const score = (dragState.x - (leftTarget.left - left)) / intervalWidth;
        if (score >= 0 && score <= 1) {
          if (score < 0.5) {
            dragTarget = leftTarget.left - left;
          } else {
            dragTarget = rightTarget.left - left;
          }
        }
      }
    }
  }

  return (
    <>
      {alignTargets.flatMap((rowTargets, row) => {
        // We want all markers in a row to have the same height
        const markerTop = Math.min(
          ...rowTargets.map((rowTarget) => rowTarget.top - top)
        );
        const markerBottom = Math.max(
          ...rowTargets.map(
            (rowTarget) => rowTarget.top + rowTarget.height - top
          )
        );

        return (
          <Fragment key={`${row}`}>
            {rowTargets.map((target, col) => {
              // We want to align markers in a column at the leftmost edge of any element in the column
              const columnTargets = alignTargets.flatMap((rowTargets) =>
                col < rowTargets.length ? [rowTargets[col]] : []
              );
              const markerLeft = Math.min(
                ...columnTargets.map((colTarget) => colTarget.left - left)
              );

              return (
                <Fragment key={`${row}-${col}`}>
                  <div
                    style={{
                      zIndex: "100",
                      position: "absolute",
                      left: `${markerLeft}px`,
                      top: `${markerTop}px`,
                      height: `${markerBottom - markerTop}px`,
                      borderLeft:
                        dragState !== null &&
                        dragState.markerRow === row &&
                        dragState.markerCol === col
                          ? "2px dotted black"
                          : "4px dotted black",
                      opacity:
                        dragState === null || dragState.markerCol === col
                          ? "1"
                          : "0.2",
                      cursor: "col-resize",
                    }}
                    onMouseDown={(e) => {
                      setDragState({
                        markerRow: row,
                        markerCol: col,
                        x: e.clientX - left,
                      });
                      e.stopPropagation();

                      const mouseMoveCallback = (e: globalThis.MouseEvent) => {
                        setDragState((dragState) =>
                          dragState
                            ? {
                                ...dragState,
                                x: e.clientX - left,
                              }
                            : null
                        );
                      };

                      const mouseUpCallback = () => {
                        window.removeEventListener(
                          "mousemove",
                          mouseMoveCallback
                        );
                        window.removeEventListener("mouseup", mouseUpCallback);
                        setDragState(() => null);
                      };

                      window.addEventListener("mousemove", mouseMoveCallback);
                      window.addEventListener("mouseup", mouseUpCallback);
                    }}
                  ></div>
                  {dragState && dragState.markerRow === row && (
                    <div
                      style={{
                        zIndex: "100",
                        position: "absolute",
                        left: `${dragTarget}px`,
                        top: `${markerTop}px`,
                        height: `${markerBottom - markerTop}px`,
                        borderLeft: "4px dotted magenta",
                      }}
                    ></div>
                  )}
                </Fragment>
              );
            })}
            {
              // Add a marker to the right of the last element
              <div
                style={{
                  zIndex: "100",
                  position: "absolute",
                  left: `${lastMarkerLeft}px`,
                  top: `${markerTop}px`,
                  height: `${markerBottom - markerTop}px`,
                  borderLeft: "2px dotted black",
                  cursor: "col-resize",
                }}
              ></div>
            }
          </Fragment>
        );
      })}
      {dragState !== null && (
        <div
          style={{
            position: "absolute",
            left: `${dragState.x}px`,
            top: "0",
            height: "100%",
            borderLeft: "4px dotted cyan",
          }}
        ></div>
      )}
    </>
  );
});
