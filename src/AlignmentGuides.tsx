import { css } from "@emotion/react";
import { Fragment, useState } from "react";

import { observer } from "mobx-react-lite";

import {
  DimensionBox,
  debugStore,
  formulaStore,
  selectionStore,
} from "./store";

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

  const { left: canvasLeft, top: canvasTop } = selectionStore.workspaceBBox;

  const lastMarkerLeft = Math.max(
    ...alignTargets.flatMap((rowTargets) => {
      const lastTarget = rowTargets[rowTargets.length - 1];
      return lastTarget !== undefined
        ? [lastTarget.left + lastTarget.width - canvasLeft]
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
    if (dragState.x < leftmost.left - canvasLeft) {
      console.log("Left of leftmost");
      dragTarget = leftmost.left - canvasLeft;
    } else if (dragState.x > rightmost.left + rightmost.width - canvasLeft) {
      console.log("Right of rightmost");
      dragTarget = rightmost.left + rightmost.width - canvasLeft;
    } else if (dragState.x > rightmost.left - canvasLeft) {
      const score =
        (dragState.x - (rightmost.left - canvasLeft)) / rightmost.width;
      console.log("In rightmost", score);
      if (score > 0.5) {
        dragTarget = rightmost.left + rightmost.width - canvasLeft;
      } else {
        dragTarget = rightmost.left - canvasLeft;
      }
    } else {
      for (let i = 0; i < rowInternalTargets.length - 1; i++) {
        const leftTarget = selectionStore.screenSpaceTargets.get(
          rowInternalTargets[i].id
        )!;
        const rightTarget = selectionStore.screenSpaceTargets.get(
          rowInternalTargets[i + 1].id
        )!;
        const intervalWidth = rightTarget.left - leftTarget.left;
        const score =
          (dragState.x - (leftTarget.left - canvasLeft)) / intervalWidth;
        if (score >= 0 && score <= 1) {
          console.log("In between", score);
          if (score < 0.5) {
            dragTarget = leftTarget.left - canvasLeft;
          } else {
            dragTarget = rightTarget.left - canvasLeft;
          }
        }
      }
    }
  }

  return (
    <div
      css={css`
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: ${dragState === null ? "none" : "auto"};
        cursor: ${dragState === null ? "auto" : "col-resize"};
        z-index: 1000;
      `}
    >
      {alignTargets.flatMap((rowTargets, row) => {
        // We want all markers in a row to have the same height
        const markerTop = Math.min(
          ...rowTargets.map((rowTarget) => rowTarget.top - canvasTop)
        );
        const markerBottom = Math.max(
          ...rowTargets.map(
            (rowTarget) => rowTarget.top + rowTarget.height - canvasTop
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
                ...columnTargets.map((colTarget) => colTarget.left - canvasLeft)
              );

              return (
                <Fragment key={`${row}-${col}`}>
                  <DraggableMarker
                    row={row}
                    col={col}
                    markerLeft={markerLeft}
                    markerTop={markerTop}
                    markerBottom={markerBottom}
                    dragState={dragState}
                    setDragState={setDragState}
                    canvasLeft={canvasLeft}
                  />
                  {
                    // Marker if this is the current internal drag target
                    dragState && dragState.markerRow === row && (
                      <div
                        style={{
                          zIndex: "200",
                          position: "absolute",
                          left: `${dragTarget}px`,
                          top: `${markerTop}px`,
                          height: `${markerBottom - markerTop}px`,
                          borderLeft: "4px dotted magenta",
                          transform: `translateX(-50%)`,
                        }}
                      ></div>
                    )
                  }
                  {
                    // Debug markers for internal targets
                    debugStore.showAlignGuides &&
                      formulaStore.alignRowInternalTargets![row].flatMap(
                        ({ id }) => (
                          <div
                            style={{
                              zIndex: "100",
                              position: "absolute",
                              left: `${selectionStore.screenSpaceTargets.get(id)!.left - canvasLeft}px`,
                              top: `${markerTop}px`,
                              height: `${markerBottom - markerTop}px`,
                              borderLeft: "1px dotted red",
                              transform: `translateX(-50%)`,
                            }}
                          ></div>
                        )
                      )
                  }
                </Fragment>
              );
            })}
            {
              // Add a marker to the right of the last element
              <DraggableMarker
                row={row}
                col={rowTargets.length}
                markerLeft={lastMarkerLeft}
                markerTop={markerTop}
                markerBottom={markerBottom}
                dragState={dragState}
                setDragState={setDragState}
                canvasLeft={canvasLeft}
              />
            }
          </Fragment>
        );
      })}
      {dragState !== null && debugStore.showAlignGuides && (
        <div
          style={{
            position: "absolute",
            left: `${dragState.x}px`,
            top: "0",
            height: "100%",
            borderLeft: "1px dotted cyan",
          }}
        ></div>
      )}
    </div>
  );
});

type DraggableMarkerProps = {
  row: number;
  col: number;
  markerLeft: number;
  markerTop: number;
  markerBottom: number;
  dragState: {
    markerRow: number;
    markerCol: number;
    x: number;
  } | null;
  setDragState: React.Dispatch<
    React.SetStateAction<{
      markerRow: number;
      markerCol: number;
      x: number;
    } | null>
  >;
  canvasLeft: number;
};

const DraggableMarker = ({
  row,
  col,
  markerLeft,
  markerTop,
  markerBottom,
  dragState,
  setDragState,
  canvasLeft,
}: DraggableMarkerProps) => (
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
      transform: `translateX(-50%)`,
      opacity: dragState === null || dragState.markerCol === col ? "1" : "0.2",
      pointerEvents: "auto",
      cursor: "col-resize",
    }}
    onMouseDown={(e) => {
      setDragState({
        markerRow: row,
        markerCol: col,
        x: e.clientX - canvasLeft,
      });
      e.stopPropagation();
      e.preventDefault();

      const mouseMoveCallback = (e: globalThis.MouseEvent) => {
        setDragState((dragState) =>
          dragState
            ? {
                ...dragState,
                x: e.clientX - canvasLeft,
              }
            : null
        );
      };

      const mouseUpCallback = () => {
        window.removeEventListener("mousemove", mouseMoveCallback);
        window.removeEventListener("mouseup", mouseUpCallback);
        setDragState(() => null);
      };

      window.addEventListener("mousemove", mouseMoveCallback);
      window.addEventListener("mouseup", mouseUpCallback);
    }}
  ></div>
);
