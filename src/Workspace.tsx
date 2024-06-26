import { css } from "@emotion/react";
import {
  ChangeEvent,
  MouseEvent,
  WheelEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { observer } from "mobx-react-lite";

import { Debug } from "./Debug";
import { RenderedFormula } from "./RenderedFormula";
import { DimensionBox, formulaStore, selectionStore } from "./store";

export const Workspace = observer(() => {
  const [showDebug, setShowDebug] = useState(false);
  const [dragState, setDragState] = useState<
    | { state: "none" }
    | { state: "leftdown"; x: number; y: number }
    | { state: "selecting" }
    | { state: "panning"; lastX: number; lastY: number }
  >({ state: "none" });

  const handleDoubleClick = useCallback((_: MouseEvent<HTMLDivElement>) => {
    selectionStore.clearSelection();
  }, []);
  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      setDragState({ state: "leftdown", x: e.clientX, y: e.clientY });
    } else if (e.button === 1) {
      setDragState({ state: "panning", lastX: e.clientX, lastY: e.clientY });
    }
  }, []);
  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (dragState.state === "leftdown") {
        selectionStore.startDragSelection(dragState.x, dragState.y);
        selectionStore.updateDragSelection(e.clientX, e.clientY);
        setDragState({ state: "selecting" });
      } else if (dragState.state === "selecting") {
        selectionStore.updateDragSelection(e.clientX, e.clientY);
      } else if (dragState.state === "panning") {
        // Update pan
        const dx = e.clientX - dragState.lastX;
        const dy = e.clientY - dragState.lastY;
        selectionStore.updatePan(dx, dy);
        setDragState({ state: "panning", lastX: e.clientX, lastY: e.clientY });
      }
    },
    [dragState, setDragState]
  );
  const handleMouseUp = useCallback(
    (_: MouseEvent<HTMLDivElement>) => {
      if (dragState.state === "selecting") {
        selectionStore.stopDragSelection();
      }
      setDragState({ state: "none" });
    },
    [dragState, setDragState]
  );
  const handleScroll = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    selectionStore.updateZoom(-e.deltaY);
  }, []);
  const handleSetRef = useCallback((ref: Element | null) => {
    selectionStore.initializeWorkspace(ref);
  }, []);
  const handleToggleShowDebug = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setShowDebug(e.target.checked);
    },
    [setShowDebug]
  );

  useEffect(() => {
    const resizeHandler = () => {
      selectionStore.updateWorkspaceDimensions();
    };
    window.addEventListener("resize", resizeHandler);

    () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

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

        overflow: hidden;
      `}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleScroll}
      ref={handleSetRef}
    >
      <div
        css={css`
          position: absolute;
          top: 0.5rem;
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
          checked={showDebug}
          onChange={handleToggleShowDebug}
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
      <SelectionRect />
      <SelectionBorders />
      <AlignmentGuides />
      <RenderedFormula />
      {showDebug && <Debug />}
    </div>
  );
});

const SelectionRect = observer(() => {
  if (!selectionStore.selectionRectDimensions) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        border: "1px solid black",
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        zIndex: "1000",
        pointerEvents: "none",
        left: `${selectionStore.selectionRectDimensions.left}px`,
        top: `${selectionStore.selectionRectDimensions.top}px`,
        width: `${selectionStore.selectionRectDimensions.width}px`,
        height: `${selectionStore.selectionRectDimensions.height}px`,
      }}
    ></div>
  );
});

const SELECTION_PADDING = 0.4;

const SelectionBorders = observer(() => {
  return (
    <>
      {Array.from(selectionStore.resolvedSelection).map((id) => {
        const target = selectionStore.screenSpaceTargets.get(id)!;
        const { left, top } = selectionStore.workspaceBBox!;
        return (
          <div
            style={{
              position: "absolute",
              left: `calc(${target.left - left}px - ${SELECTION_PADDING}rem)`,
              top: `calc(${target.top - top}px - ${SELECTION_PADDING}rem)`,
              width: `calc((${target.width}px + ${2 * SELECTION_PADDING}rem)`,
              height: `calc(${target.height}px + ${2 * SELECTION_PADDING}rem)`,
              border: "2px dashed black",
              zIndex: "1000",
            }}
            key={id}
          ></div>
        );
      })}
    </>
  );
});

const AlignmentGuides = observer(() => {
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
          <>
            {rowTargets.map((target, col) => {
              // We want to align markers in a column at the leftmost edge of any element in the column
              const columnTargets = alignTargets.flatMap((rowTargets) =>
                col < rowTargets.length ? [rowTargets[col]] : []
              );
              const markerLeft = Math.min(
                ...columnTargets.map((colTarget) => colTarget.left - left)
              );

              return (
                <>
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
                </>
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
          </>
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
