import { css as classname } from "@emotion/css";
import { useEffect, useState } from "react";
import useStateRef from "react-usestateref";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { StreamLanguage } from "@codemirror/language";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import {
  EditorSelection,
  EditorState,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { EditorView, basicSetup } from "codemirror";
import { printPrettier as prettyLaTeX } from "prettier-plugin-latex/standalone";

import {
  ContentChange,
  FormulaLatexRangeNode,
  StyledRange,
  UnstyledRange,
} from "../../FormulaText";
import {
  type AugmentedFormula,
  checkFormulaCode,
  deriveAugmentedFormula,
} from "../../FormulaTree";
import { formulaStore, selectionStore } from "../../store";
import * as styles from "../../styles";

type DecorationRange = { to: number; from: number; decoration: Decoration };

// Calculates the decorations for the styled ranges in the formula
const styledRanges = (view: EditorView) => {
  const builder = new RangeSetBuilder<Decoration>();

  const styledRanges = formulaStore.styledRanges;

  const buildDecoration = (
    range: FormulaLatexRangeNode,
    baseOffset: number,
    nestingDepth: number
  ): [DecorationRange[], number] => {
    if (range instanceof UnstyledRange) {
      return [[], baseOffset + range.text.length];
    } else {
      let offset = baseOffset;
      let decorations: DecorationRange[] = [];
      for (const child of range.children) {
        const [newDecorations, newOffset] = buildDecoration(
          child,
          offset,
          nestingDepth + 1
        );
        offset = newOffset;
        decorations = decorations.concat(newDecorations);
      }
      return [
        decorations.concat(
          range.hints?.noMark
            ? []
            : [
                {
                  from: baseOffset,
                  to: offset,
                  decoration: Decoration.mark({
                    class: classname`
                position: relative;
                pointer-events: none;
                /* border: 1px solid ${range.hints?.color || "black"}; */

                &::before {
                  content: "";
                  position: absolute;
                  top: 0;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  opacity: ${
                    view.state.field(styledRangeSelectionState).has(range.id)
                      ? 0.1
                      : 0
                  };
                  background-color: ${range.hints?.color || "black"};
                }

                &::after {
                  content: "";
                  position: absolute;
                  z-index: ${nestingDepth};
                  top: ${-4 + 4 * nestingDepth}px;
                  left: 0;
                  width: 100%;
                  height: ${
                    view.state.field(styledRangeSelectionState).has(range.id)
                      ? "4px"
                      : "2px"
                  };
                  background-color: ${range.hints?.color || "black"};
                }
              `,
                    // This isn't actually very good: perfectly overlapping ranges will be obscured
                    // by the innermost range's tooltip. But doing otherwise requires injecting HTML
                    // via CodeMirror's "Widget" decorations
                    // TODO: doesn't work anyway, span pointer events break clicking to move cursor
                    // attributes: range.hints?.tooltip
                    //   ? {
                    //       title: range.hints.tooltip,
                    //     }
                    //   : {},
                  }),
                },
              ]
        ),
        offset,
      ];
    }
  };

  let offset = 0;
  let decorations: DecorationRange[] = [];
  for (const range of styledRanges.ranges) {
    const [newDecorations, newOffset] = buildDecoration(range, offset, 0);
    offset = newOffset;
    // CodeMirror requires that calls to builder.add be in order of increasing start position
    // so we just collect them first
    decorations = decorations.concat(newDecorations);
  }

  // then sort
  decorations = decorations.sort((a, b) => a.from - b.from);

  // and apply to the builder in order
  for (const { from, to, decoration } of decorations) {
    builder.add(from, to, decoration);
  }

  return builder.finish();
};

// Shows the styled ranges in the CodeMirror editor
const styledRangeViewExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = styledRanges(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.state.field(styledRangeSelectionState) !==
          update.startState.field(styledRangeSelectionState)
      ) {
        this.decorations = styledRanges(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// Manages the cursor/selection state for styled ranges
const styledRangeCursorExtension = EditorState.transactionFilter.of((tr) => {
  // console.log("Some transaction", tr);
  const newSelection = tr.selection;
  if (newSelection && !tr.docChanged) {
    const prevSelection = tr.startState.selection;

    if (
      newSelection.ranges.length === 1 &&
      prevSelection.ranges.length === 1 &&
      newSelection.ranges[0].from === newSelection.ranges[0].to &&
      prevSelection.ranges[0].from === prevSelection.ranges[0].to
    ) {
      const styledRanges = formulaStore.styledRanges;
      const touchedRanges = styledRanges
        .getPositionRanges(newSelection.ranges[0].from)
        .filter((range): range is StyledRange => range instanceof StyledRange);
      const prevTouchedRanges = styledRanges
        .getPositionRanges(prevSelection.ranges[0].from)
        .filter((range): range is StyledRange => range instanceof StyledRange);

      if (
        Math.abs(newSelection.ranges[0].from - prevSelection.ranges[0].from) > 1
      ) {
        // "Jump" due to mouse or ctrl+arrow key movement
        return {
          ...tr,
          effects: [
            setStyledRangeSelections.of(
              new Set(touchedRanges.map((r) => r.id))
            ),
          ],
        };
      }

      // We calculate the ranges both including and excluding the edges because
      // for entering ranges, we want to exclude the edges (so the cursor can be
      // placed against the edge of the range without entering), but for exiting
      // ranges, we want to include the edges (so the cursor can be placed at
      // the edge of the range without exiting).
      const inclusiveTouchedRanges = styledRanges
        .getPositionRanges(newSelection.ranges[0].from, true)
        .filter((range): range is StyledRange => range instanceof StyledRange);
      const inclusivePrevTouchedRanges = styledRanges
        .getPositionRanges(prevSelection.ranges[0].from, true)
        .filter((range): range is StyledRange => range instanceof StyledRange);

      console.log(
        "Cursor move",
        newSelection.ranges[0].from,
        styledRanges,
        touchedRanges.map((range) => range.id),
        inclusiveTouchedRanges.map((range) => range.id)
      );

      // Moving out of ranges takes priority over moving into ranges
      const lostRanges = inclusivePrevTouchedRanges.filter(
        (range) => !inclusiveTouchedRanges.find((r) => r.equals(range))
      );
      const currentActiveRanges = tr.startState.field(
        styledRangeSelectionState
      );
      const lostActiveRanges = lostRanges.filter((range) =>
        currentActiveRanges.has(range.id)
      );
      if (lostActiveRanges.length > 0) {
        // Move out of the deepest range
        console.log(
          "Moving out of range",
          lostActiveRanges[lostActiveRanges.length - 1].id
        );
        const newActiveRanges = new Set(
          Array.from(currentActiveRanges).filter(
            (range) =>
              range !== lostActiveRanges[lostActiveRanges.length - 1].id &&
              inclusiveTouchedRanges.some((r) => r.id === range)
          )
        );
        return {
          effects: [setStyledRangeSelections.of(newActiveRanges)],
        };
      }

      // Move into the shallowest new range, if any
      const gainedRanges = touchedRanges
        .filter((range) => !prevTouchedRanges.find((r) => r.equals(range)))
        .concat(
          // Include 1-wide ranges that we "step over"
          inclusiveTouchedRanges.filter((range) =>
            inclusivePrevTouchedRanges.some((r) => r.equals(range))
          )
        );
      const gainedInactiveRanges = gainedRanges.filter(
        (range) => !currentActiveRanges.has(range.id)
      );
      if (gainedInactiveRanges.length > 0) {
        console.log("Moving into range", gainedInactiveRanges[0].id);
        const newActiveRanges = new Set([
          ...Array.from(currentActiveRanges),
          gainedInactiveRanges[0].id,
        ]);
        return {
          effects: [setStyledRangeSelections.of(newActiveRanges)],
        };
      }
    }
  }
  return tr;
});

// Boilerplate state getter/setter for the selection range cursor
// Contains the IDs of the styled ranges that the cursor is currently inside
const setStyledRangeSelections = StateEffect.define<Set<string>>();
const styledRangeSelectionState = StateField.define({
  create() {
    return new Set<string>();
  },

  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setStyledRangeSelections)) {
        console.log("Setting selection state to", effect.value);
        value = effect.value;
      }
    }
    return value;
  },
});

const styledRangeEditExtension = EditorState.transactionFilter.of((tr) => {
  if (tr.docChanged) {
    if (tr.newDoc.toString() === formulaStore.latexWithoutStyling) {
      // Full document replacement, ignore
      return tr;
    }

    console.log("Document changed", tr);
    const changes: ContentChange[] = [];
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      if (fromA < toA) {
        console.log("Deletion:", fromA, toA);
        changes.push({
          type: "delete",
          from: fromA,
          to: toA,
        });
      }

      if (fromB < toB) {
        console.log("Insertion:", fromB, toB, inserted.toString());
        changes.push({
          type: "insert",
          from: fromB,
          to: toB,
          inserted: inserted.toString(),
        });
      }
    });

    const activeRanges = tr.state.field(styledRangeSelectionState);
    let newRanges = formulaStore.styledRanges;
    console.log("Styled ranges before edit:", newRanges.toLatex());
    for (const change of changes) {
      newRanges = newRanges.withContentChange(change, activeRanges);
    }
    console.log("Styled ranges after edit:", newRanges.toLatex());

    formulaStore.overrideStyledRanges(newRanges);

    if (checkFormulaCode(newRanges.toLatex())) {
      console.log("Valid content latex, updating formula");
      requestAnimationFrame(() => {
        formulaStore.updateFormula(deriveAugmentedFormula(newRanges.toLatex()));
      });
    }

    return tr;
  }
  return tr;
});

const EditorTab = ({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`
      h-full px-4 border-b-2
      ${selected ? "bg-white border-black" : "bg-gray-100 border-transparent"}
    `}
  >
    {children}
  </button>
);

export const Editor = observer(() => {
  const [currentEditor, setCurrentEditor] = useState<"full" | "content-only">(
    "full"
  );
  return (
    <>
      <div className="h-8 bg-gray-100">
        <EditorTab
          onClick={() => setCurrentEditor("full")}
          selected={currentEditor === "full"}
        >
          Full LaTeX
        </EditorTab>
      </div>
      {
        /*currentEditor === "full" ? <FullStyleEditor /> : <ContentOnlyEditor />*/
        <FullStyleEditor />
      }
    </>
  );
});

const FullStyleEditor = observer(() => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [editorCodeCorrect, setEditorCodeCorrect] = useState(true);
  const [, setSuppressCodeUpdate, suppressCodeUpdateRef] = useStateRef(false);

  useEffect(() => {
    if (container && (!editorView || editorView.contentDOM !== container)) {
      // Automatically update the formula when the editor code changes
      const codeUpdateListener = EditorView.updateListener.of((update) => {
        if (
          update.docChanged &&
          update.state.doc.toString() !== formulaStore.latexWithStyling
        ) {
          console.log("Editor code changed:", update);
          const newCode = update.state.doc.toString();
          if (checkFormulaCode(newCode)) {
            setEditorCodeCorrect(() => true);
            formulaStore.updateFormula(deriveAugmentedFormula(newCode));
          } else {
            setEditorCodeCorrect(() => false);
          }
        }
      });

      const newEditorView = new EditorView({
        state: EditorState.create({
          // extensions: [basicSetup, StreamLanguage.define(stex), codeUpdateListener],
          extensions: [
            basicSetup,
            EditorView.lineWrapping,
            StreamLanguage.define(stex),
            codeUpdateListener,
            EditorView.theme({
              ".cm-activeLine": {
                "background-color": `${styles.COLORS.baseDark}44`,
              },
              ".cm-selectionBackground": {
                "background-color": `${styles.COLORS.selection} !important`,
              },
              "::selection": {
                "background-color": `${styles.COLORS.selection} !important`,
              },
              ".cm-focused": {
                border: `none`,
                outline: `none`,
              },
            }),
            syntaxHighlighting(
              // https://lezer.codemirror.net/docs/ref/#highlight.tags
              HighlightStyle.define([{ tag: t.name, color: "#2b65bd" }])
            ),
          ],
          doc: formulaStore.latexWithStyling,
        }),
        parent: container,
      });
      setEditorView(newEditorView);

      // Automatically update the editor code when the formula changes due to interactions
      const disposeUpdateCodeReaction = reaction(
        () => formulaStore.latexWithStyling,
        (latex) => {
          console.log("Synchronizing editor with new formula", latex);
          setEditorCodeCorrect(() => true);

          if (suppressCodeUpdateRef.current) {
            console.log("Suppressing code update");
            return;
          }

          prettyLaTeX(latex, { printWidth: 30 }).then((pretty: string) => {
            newEditorView.dispatch([
              newEditorView.state.update({
                changes: {
                  from: 0,
                  to: newEditorView.state.doc.length,
                  insert: pretty,
                },
              }),
            ]);
          });
        }
      );

      const disposeUpdateSelectionReaction = reaction(
        () =>
          [selectionStore.siblingSelections, formulaStore.latexRanges] as const,
        ([selectionRanges, latexRanges]) => {
          if (suppressCodeUpdateRef.current) {
            console.log("Suppressing selection update");
            return;
          }

          console.log("selection:", selectionRanges);
          const selections = selectionRanges.flatMap((range) => {
            const first = range[0];
            const last = range.slice(-1)[0];
            if (!(first in latexRanges) || !(last in latexRanges)) {
              return [];
            }

            const [firstStart, _] = latexRanges[first];
            const [__, lastEnd] = latexRanges[last];
            console.log(first, firstStart, last, lastEnd);
            return [EditorSelection.range(firstStart, lastEnd)];
          });

          newEditorView.dispatch({
            selection:
              selections.length > 0
                ? EditorSelection.create(selections)
                : EditorSelection.single(0),
          });
        }
      );

      // Suppress updates to the formula when changing the editor code
      newEditorView.contentDOM.addEventListener("focus", () => {
        setSuppressCodeUpdate(() => true);
      });

      // Automatically update the formula when the editor code changes
      newEditorView.contentDOM.addEventListener("blur", () => {
        setSuppressCodeUpdate(() => false);
        formulaStore.overrideStyledRanges(null);
        setEditorCodeCorrect(() => true);

        // Synchronize the editor with the current formula
        prettyLaTeX(formulaStore.latexWithStyling, { printWidth: 30 }).then(
          (pretty: string) => {
            newEditorView.dispatch([
              newEditorView.state.update({
                changes: {
                  from: 0,
                  to: newEditorView.state.doc.length,
                  insert: pretty,
                },
              }),
            ]);
          }
        );
      });

      return () => {
        disposeUpdateCodeReaction();
        disposeUpdateSelectionReaction();
        newEditorView.destroy();
      };
    }
  }, [container, setEditorView]);

  return (
    <div
      className={`w-full h-[calc(100%-2rem)] border ${editorCodeCorrect ? "border-transparent" : "border-red-500"}`}
      ref={(ref) => setContainer(ref)}
    ></div>
  );
});

// @ts-expect-error Currently unused
const ContentOnlyEditor = observer(() => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [editorCodeCorrect, setEditorCodeCorrect] = useState(true);
  const [, setSuppressCodeUpdate, suppressCodeUpdateRef] = useStateRef(false);

  useEffect(() => {
    if (container && (!editorView || editorView.contentDOM !== container)) {
      const codeUpdateListener = EditorView.updateListener.of((update) => {
        if (
          update.docChanged &&
          update.state.doc.toString() !== formulaStore.latexWithStyling
        ) {
          const newCode = update.state.doc.toString();
          if (checkFormulaCode(newCode)) {
            setEditorCodeCorrect(() => true);
          } else {
            setEditorCodeCorrect(() => false);
          }
        }
      });

      const newEditorView = new EditorView({
        state: EditorState.create({
          extensions: [
            basicSetup,
            // history(),
            // historyField,
            // keymap.of(historyKeymap),
            EditorView.lineWrapping,
            StreamLanguage.define(stex),
            codeUpdateListener,
            styledRangeViewExtension,
            styledRangeSelectionState,
            styledRangeCursorExtension,
            styledRangeEditExtension,
          ],
          doc: formulaStore.latexWithoutStyling,
        }),
        parent: container,
      });
      setEditorView(newEditorView);

      // Automatically update the editor code when the formula changes due to interactions
      const disposeReaction = reaction(
        (): [AugmentedFormula, string] => [
          formulaStore.augmentedFormula,
          formulaStore.latexWithoutStyling,
        ],
        ([, latex]) => {
          if (suppressCodeUpdateRef.current) {
            console.log("Suppressing code update");
            return;
          }

          console.log("Synchronizing editor with new formula", latex);
          setEditorCodeCorrect(() => true);
          newEditorView.dispatch([
            newEditorView.state.update({
              changes: {
                from: 0,
                to: newEditorView.state.doc.length,
                insert: latex,
              },
            }),
          ]);
        }
      );

      // Suppress updates to the formula when changing the editor code
      newEditorView.contentDOM.addEventListener("focus", () => {
        setSuppressCodeUpdate(() => true);
      });

      // Automatically update the formula when the editor code changes
      newEditorView.contentDOM.addEventListener("blur", () => {
        setSuppressCodeUpdate(() => false);
        formulaStore.overrideStyledRanges(null);

        // Synchronize the editor with the current formula
        newEditorView.dispatch([
          newEditorView.state.update({
            changes: {
              from: 0,
              to: newEditorView.state.doc.length,
              insert: formulaStore.latexWithoutStyling,
            },
          }),
        ]);
      });

      return () => {
        disposeReaction();
        newEditorView.destroy();
      };
    }
  }, [container, setEditorView]);

  return (
    <div
      className={`w-full h-[calc(100%-2rem)] border ${editorCodeCorrect ? "border-transparent" : "border-red-500"}`}
      ref={(ref) => setContainer(ref)}
    ></div>
  );
});

(window as any).testPositionRanges = (
  includeEdges: boolean = false,
  position?: number
) => {
  const ranges = formulaStore.augmentedFormula.toStyledRanges();
  console.log(formulaStore.augmentedFormula.toStyledRanges());
  if (position !== undefined) {
    console.log(
      position,
      formulaStore.latexWithoutStyling[position],
      ranges
        .getPositionRanges(position, includeEdges)
        .filter((r): r is StyledRange => r instanceof StyledRange)
        .map((r) => r.id)
        .join(", ")
    );
  } else {
    console.table(
      formulaStore.latexWithoutStyling.split("").map((c, i) => [
        i,
        c,
        ranges
          .getPositionRanges(i, includeEdges)
          .filter((r): r is StyledRange => r instanceof StyledRange)
          .map((r) => r.id)
          .join(", "),
      ])
    );
  }
};

(window as any).testStyledToLatex = () => {
  console.log(formulaStore.augmentedFormula.toStyledRanges().toLatex());
  console.log(formulaStore.augmentedFormula.toLatex("no-id"));
};
