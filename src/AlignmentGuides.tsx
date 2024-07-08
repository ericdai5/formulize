import { css } from "@emotion/react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import { Group } from "./FormulaTree";
import { replaceNodes } from "./formulaTransformations";
import {
  DimensionBox,
  debugStore,
  formulaStore,
  selectionStore,
} from "./store";

export const AlignmentGuides = observer(() => {
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
  return selectionStore.workspaceBBox === null ||
    alignTargets === undefined ? null : (
    <AlignmentGuidesInternal
      alignTargets={alignTargets}
      canvasLeft={selectionStore.workspaceBBox.left}
      canvasTop={selectionStore.workspaceBBox.top}
    />
  );
});

const AlignmentGuidesInternal = observer(
  ({
    alignTargets,
    canvasLeft,
    canvasTop,
  }: {
    alignTargets: ({ id: string } & DimensionBox)[][];
    canvasLeft: number;
    canvasTop: number;
  }) => {
    const [dragState, setDragState] = useState<{
      markerRow: number;
      markerCol: number;
      x: number;
    } | null>(null);

    const lastMarkerLeft = Math.max(
      ...alignTargets.flatMap((rowTargets) => {
        const lastTarget = rowTargets[rowTargets.length - 1];
        return lastTarget !== undefined
          ? [lastTarget.left + lastTarget.width - canvasLeft]
          : [];
      })
    );

    let dragTarget: number | null = null;
    // Null if the target is either left/right extreme, or id of the target
    let dragTargetId: string | null = null;
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
        // Left of the leftmost element
        dragTarget = leftmost.left - canvasLeft;
        dragTargetId = null;
      } else if (dragState.x > rightmost.left + rightmost.width - canvasLeft) {
        // Right of the rightmost element
        dragTarget = rightmost.left + rightmost.width - canvasLeft;
        dragTargetId = null;
      } else if (dragState.x > rightmost.left - canvasLeft) {
        // Inside the rightmost element
        const score =
          (dragState.x - (rightmost.left - canvasLeft)) / rightmost.width;
        if (score > 0.5) {
          dragTarget = rightmost.left + rightmost.width - canvasLeft;
          dragTargetId = null;
        } else {
          dragTarget = rightmost.left - canvasLeft;
          dragTargetId = rightmost.id;
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
            if (score < 0.5) {
              if (i === 0) {
                // Inside the leftmost element
                dragTarget = leftTarget.left - canvasLeft;
                dragTargetId = null;
              } else {
                // On the left half of any other interval
                dragTarget = leftTarget.left - canvasLeft;
                dragTargetId = leftTarget.id;
              }
            } else {
              // On the right half of an interval
              dragTarget = rightTarget.left - canvasLeft;
              dragTargetId = rightTarget.id;
            }
          }
        }
      }
    }

    debugStore.setAlignDragState(
      dragState
        ? {
            row: dragState.markerRow,
            col: dragState.markerCol,
            currentDropTargetId: dragTargetId,
          }
        : null
    );

    const onDrag = useCallback(
      (markerRow: number, markerCol: number, x: number) => {
        setDragState({ markerRow, markerCol, x });
      },
      [setDragState]
    );

    const onStopDrag = useCallback(() => {
      if (!dragState) {
        console.log("Somehow stopped drag without drag state");
        return;
      }

      if (dragTargetId === null) {
        if (
          dragState.markerCol === 0 ||
          dragState.markerCol === alignTargets[dragState.markerRow].length
        ) {
          // At either extreme, the drag target does nothing
          setDragState(null);
          return;
        }

        // Otherwise, we need to delete the marker
        console.log("Deleting marker");
        formulaStore.updateFormula(
          replaceNodes(formulaStore.augmentedFormula, (node) => {
            if (node.type === "array" && node._parent === null) {
              return node.withChanges({
                body: node.body.map((row, rowIdx) =>
                  rowIdx === dragState.markerRow
                    ? row.flatMap((cell, colIdx) => {
                        if (colIdx === dragState.markerCol - 1) {
                          return [
                            new Group("", [cell, row[dragState.markerCol]]),
                          ];
                        } else if (colIdx === dragState.markerCol) {
                          return [];
                        }
                        return cell;
                      })
                    : row
                ),
              });
            }
            return node;
          })
        );
      } else {
        // We need to insert or move a marker
        if (
          dragState.markerCol === 0 ||
          dragState.markerCol === alignTargets[dragState.markerRow].length
        ) {
          // When the drag started from the left/right extreme, we are inserting a marker
          console.log("Inserting marker");
          formulaStore.updateFormula(
            replaceNodes(formulaStore.augmentedFormula, (node) => {
              if (node.type === "array" && node._parent === null) {
                return node.withChanges({
                  body: node.body.map((row, rowIdx) =>
                    rowIdx === dragState.markerRow
                      ? row.flatMap((cell) => {
                          if (
                            cell.contains(dragTargetId!) &&
                            cell instanceof Group
                          ) {
                            const splitIndex = cell.body.findIndex(
                              (node) => node.id === dragTargetId
                            );
                            const [left, right] = [
                              cell.body.slice(0, splitIndex),
                              cell.body.slice(splitIndex),
                            ];
                            return [new Group("", left), new Group("", right)];
                          } else {
                            return cell;
                          }
                        })
                      : row
                  ),
                });
              }
              return node;
            })
          );
        } else {
          // Otherwise, we are moving a marker
          console.log("Moving marker");
          formulaStore.updateFormula(
            replaceNodes(formulaStore.augmentedFormula, (node) => {
              if (node.type === "array" && node._parent === null) {
                return node.withChanges({
                  body: node.body.map((row, rowIdx) => {
                    if (rowIdx !== dragState.markerRow) {
                      return row;
                    }
                    const insertColIdx = row.findIndex((cell) =>
                      cell.contains(dragTargetId!)
                    );
                    const insertTarget = row[insertColIdx];
                    if (
                      !(insertTarget instanceof Group) ||
                      insertColIdx === -1
                    ) {
                      // Only multi-cell groups can be split
                      return row;
                    }
                    const splitIndex = insertTarget.body.findIndex(
                      (node) => node.id === dragTargetId
                    );
                    const [left, right] = [
                      insertTarget.body.slice(0, splitIndex),
                      insertTarget.body.slice(splitIndex),
                    ];
                    if (insertColIdx === dragState.markerCol) {
                      // We just need to shift the left side of this column to the previous column
                      if (dragState.markerCol === 0) {
                        console.log("Moving leftmost marker");
                        // We need to add a new column on the left
                        return [
                          new Group("", left),
                          new Group("", right),
                          ...row.slice(1),
                        ];
                      } else {
                        // We can shift the left side of the column to the previous column
                        const before = row.slice(0, dragState.markerCol - 1);
                        const leftCol = row[dragState.markerCol - 1];
                        const after = row.slice(dragState.markerCol + 1);

                        console.log(
                          "Moving marker right within column",
                          before,
                          leftCol,
                          left,
                          right,
                          after
                        );
                        return [
                          ...before,
                          new Group("", [leftCol, ...left]),
                          new Group("", right),
                          ...after,
                        ];
                      }
                    } else if (insertColIdx > dragState.markerCol) {
                      // Marker is moving right
                      console.log("Moving marker right");
                      const before = row.slice(0, dragState.markerCol - 1);
                      const leftCol = row[dragState.markerCol - 1];
                      const between = row.slice(
                        dragState.markerCol,
                        insertColIdx
                      );
                      const after = row.slice(insertColIdx + 1);
                      return [
                        ...before,
                        new Group("", [leftCol, ...between, ...left]),
                        new Group("", right),
                        ...after,
                      ];
                    } else {
                      console.log("Moving marker left");
                      // Marker is moving left
                      const before = row.slice(0, insertColIdx);
                      const between = row.slice(
                        insertColIdx + 1,
                        dragState.markerCol
                      );
                      const rightCol = row[dragState.markerCol];
                      const after = row.slice(dragState.markerCol + 1);
                      return [
                        ...before,
                        ...(left.length > 0 ? [new Group("", [...left])] : []),
                        new Group("", [...right, ...between, rightCol]),
                        ...after,
                      ];
                    }
                  }),
                });
              }
              return node;
            })
          );
        }
      }

      setDragState(null);
    }, [dragState, dragTargetId, alignTargets, setDragState]);

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
              {rowTargets.map((_, col) => {
                // We want to align markers in a column at the leftmost edge of any element in the column
                const columnTargets = alignTargets.flatMap((rowTargets) =>
                  col < rowTargets.length ? [rowTargets[col]] : []
                );
                const markerLeft = Math.min(
                  ...columnTargets.map(
                    (colTarget) => colTarget.left - canvasLeft
                  )
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
                      onDrag={onDrag}
                      onStopDrag={onStopDrag}
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
                                left: `${
                                  selectionStore.screenSpaceTargets.get(id)!
                                    .left - canvasLeft
                                }px`,
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
                  onDrag={onDrag}
                  onStopDrag={onStopDrag}
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
  }
);

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
  onDrag: (row: number, col: number, x: number) => void;
  onStopDrag: () => void;
  canvasLeft: number;
};

const DraggableMarker = ({
  row,
  col,
  markerLeft,
  markerTop,
  markerBottom,
  dragState,
  onDrag,
  onStopDrag,
  canvasLeft,
}: DraggableMarkerProps) => {
  const onDragRef = useRef(onDrag);
  useEffect(() => {
    onDragRef.current = onDrag;
  }, [onDrag]);
  const onStopDragRef = useRef(onStopDrag);
  useEffect(() => {
    onStopDragRef.current = onStopDrag;
  }, [onStopDrag]);

  return (
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
        opacity:
          dragState === null || dragState.markerCol === col ? "1" : "0.2",
        pointerEvents: "auto",
        cursor: "col-resize",
      }}
      onMouseDown={(e) => {
        onDragRef.current(row, col, e.clientX - canvasLeft);
        e.stopPropagation();
        e.preventDefault();

        const mouseMoveCallback = (e: globalThis.MouseEvent) => {
          onDragRef.current(row, col, e.clientX - canvasLeft);
        };

        const mouseUpCallback = () => {
          window.removeEventListener("mousemove", mouseMoveCallback);
          window.removeEventListener("mouseup", mouseUpCallback);
          onStopDragRef.current();
        };

        window.addEventListener("mousemove", mouseMoveCallback);
        window.addEventListener("mouseup", mouseUpCallback);
      }}
    ></div>
  );
};
