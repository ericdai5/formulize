import { css as classname } from "@emotion/css";
import { Global, css } from "@emotion/react";
import styled from "@emotion/styled";
import { useEffect, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { StreamLanguage } from "@codemirror/language";
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
import { EditorView, basicSetup } from "codemirror";

import {
  FormulaLatexRange,
  StyledRange,
  UnstyledRange,
  getPositionRanges,
} from "./FormulaText";
import { checkFormulaCode, deriveAugmentedFormula } from "./FormulaTree";
import { formulaStore } from "./store";

type DecorationRange = { to: number; from: number; decoration: Decoration };

// Calculates the decorations for the styled ranges in the formula
const styledRanges = (view: EditorView) => {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  const styledRanges = formulaStore.augmentedFormula.toStyledRanges();

  const buildDecoration = (
    range: FormulaLatexRange,
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
        decorations.concat([
          {
            from: baseOffset,
            to: offset,
            decoration: Decoration.mark({
              class: classname`
                position: relative;
                /* border: 1px solid ${range.hints?.color || "black"}; */

                &::after {
                  content: "";
                  position: absolute;
                  z-index: ${nestingDepth};
                  top: ${-4 + 4 * nestingDepth}px;
                  left: 0;
                  width: 100%;
                  height: ${view.state.field(styledRangeSelectionState).has(range.id) ? 4 : 2}px;
                  background-color: ${range.hints?.color || "black"};
                }
              `,
              // This isn't actually very good: perfectly overlapping ranges will be obscured
              // by the innermost range's tooltip. But doing otherwise requires injecting HTML
              // via CodeMirror's "Widget" decorations
              attributes: range.hints?.tooltip
                ? {
                    title: range.hints.tooltip,
                  }
                : {},
            }),
          },
        ]),
        offset,
      ];
    }
  };

  let offset = 0;
  let decorations: DecorationRange[] = [];
  for (const range of styledRanges) {
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
  const newSelection = tr.selection;
  if (newSelection && !tr.docChanged) {
    const prevSelection = tr.startState.selection;

    // TODO: We currently only handle between-character cursor movement, not multi-character selections
    if (
      newSelection.ranges.length === 1 &&
      prevSelection.ranges.length === 1 &&
      newSelection.ranges[0].from === newSelection.ranges[0].to &&
      prevSelection.ranges[0].from === prevSelection.ranges[0].to
    ) {
      const styledRanges = formulaStore.augmentedFormula.toStyledRanges();
      const touchedRanges = getPositionRanges(
        styledRanges,
        newSelection.ranges[0].from
      ).filter((range): range is StyledRange => range instanceof StyledRange);
      const prevTouchedRanges = getPositionRanges(
        styledRanges,
        prevSelection.ranges[0].from
      ).filter((range): range is StyledRange => range instanceof StyledRange);

      // We calculate the ranges both including and excluding the edges because
      // for entering ranges, we want to exclude the edges (so the cursor can be
      // placed against the edge of the range without entering), but for exiting
      // ranges, we want to include the edges (so the cursor can be placed at
      // the edge of the range without exiting).
      const inclusiveTouchedRanges = getPositionRanges(
        styledRanges,
        newSelection.ranges[0].from,
        true
      ).filter((range): range is StyledRange => range instanceof StyledRange);
      const inclusivePrevTouchedRanges = getPositionRanges(
        styledRanges,
        prevSelection.ranges[0].from,
        true
      ).filter((range): range is StyledRange => range instanceof StyledRange);

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
              range !== lostActiveRanges[lostActiveRanges.length - 1].id
          )
        );
        return {
          effects: [setStyledRangeSelections.of(newActiveRanges)],
        };
      }

      // Move into the shallowest new range, if any
      const gainedRanges = touchedRanges.filter(
        (range) => !prevTouchedRanges.find((r) => r.equals(range))
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

const EditorTab = styled.button`
  height: 100%;
  background-color: ${(props) => (props.selected ? "white" : "#f0f0f0")};
  border: none;
  border-bottom: ${(props) => (props.selected ? "2px solid black" : "none")};
  padding: 0 1rem;
`;

export const Editor = observer(() => {
  const [currentEditor, setCurrentEditor] = useState<"full" | "content-only">(
    "full"
  );

  return (
    <>
      <Global
        styles={css`
          .cm-editor {
            height: 100%;
            font-size: 1.5rem;
          }
        `}
      />
      <div
        css={css`
          height: 2rem;
          background-color: #f0f0f0;
        `}
      >
        <EditorTab
          onClick={() => setCurrentEditor("full")}
          selected={currentEditor === "full"}
        >
          Full LaTeX
        </EditorTab>
        <EditorTab
          onClick={() => setCurrentEditor("content-only")}
          selected={currentEditor === "content-only"}
        >
          Content-Only
        </EditorTab>
      </div>
      {currentEditor === "full" ? <FullStyleEditor /> : <ContentOnlyEditor />}
    </>
  );
});

const FullStyleEditor = observer(() => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [editorCodeCorrect, setEditorCodeCorrect] = useState(true);

  useEffect(() => {
    if (container && (!editorView || editorView.contentDOM !== container)) {
      // Automatically update the formula when the editor code changes
      // TODO: This doesn't work because cursor position is reset
      // const codeUpdateListener = EditorView.updateListener.of((update) => {
      //   if (
      //     update.docChanged &&
      //     update.state.doc.toString() !== formulaStore.latexWithStyling
      //   ) {
      //     console.log("Editor code changed:", update);
      //     const newCode = update.state.doc.toString();
      //     if (checkFormulaCode(newCode)) {
      //       setEditorCodeCorrect(() => true);
      //       formulaStore.updateFormula(deriveAugmentedFormula(newCode));
      //     } else {
      //       setEditorCodeCorrect(() => false);
      //     }
      //   }
      // });

      const newEditorView = new EditorView({
        state: EditorState.create({
          // extensions: [basicSetup, StreamLanguage.define(stex), codeUpdateListener],
          extensions: [
            basicSetup,
            EditorView.lineWrapping,
            StreamLanguage.define(stex),
          ],
          doc: formulaStore.latexWithStyling,
        }),
        parent: container,
      });
      setEditorView(newEditorView);

      // Automatically update the editor code when the formula changes due to interactions
      const disposeReaction = reaction(
        () => formulaStore.latexWithStyling,
        (latex) => {
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

      // Automatically update the formula when the editor code changes
      newEditorView.contentDOM.addEventListener("blur", () => {
        const newCode = newEditorView.state.doc.toString();
        if (checkFormulaCode(newCode)) {
          setEditorCodeCorrect(() => true);
          formulaStore.updateFormula(deriveAugmentedFormula(newCode));
        } else {
          setEditorCodeCorrect(() => false);
        }
      });

      return () => {
        disposeReaction();
        newEditorView.destroy();
      };
    }
  }, [container, setEditorView]);

  return (
    <div
      css={css`
        width: 100%;
        height: calc(100% - 2rem);
        border: 2px solid ${editorCodeCorrect ? "transparent" : "red"};
      `}
      ref={(ref) => setContainer(ref)}
    ></div>
  );
});

const ContentOnlyEditor = observer(() => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [editorCodeCorrect, setEditorCodeCorrect] = useState(true);

  useEffect(() => {
    if (container && (!editorView || editorView.contentDOM !== container)) {
      const newEditorView = new EditorView({
        state: EditorState.create({
          // extensions: [basicSetup, StreamLanguage.define(stex), codeUpdateListener],
          extensions: [
            basicSetup,
            EditorView.lineWrapping,
            StreamLanguage.define(stex),
            styledRangeViewExtension,
            styledRangeSelectionState,
            styledRangeCursorExtension,
          ],
          doc: formulaStore.latexWithoutStyling,
        }),
        parent: container,
      });
      setEditorView(newEditorView);

      // Automatically update the editor code when the formula changes due to interactions
      const disposeReaction = reaction(
        () => formulaStore.latexWithoutStyling,
        (latex) => {
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

      // Automatically update the formula when the editor code changes
      // TODO: temporarily suppressed while developing content-only editor
      // newEditorView.contentDOM.addEventListener("blur", () => {
      //   const newCode = newEditorView.state.doc.toString();
      //   if (checkFormulaCode(newCode)) {
      //     setEditorCodeCorrect(() => true);
      //     formulaStore.updateFormula(deriveAugmentedFormula(newCode));
      //   } else {
      //     setEditorCodeCorrect(() => false);
      //   }
      // });

      return () => {
        disposeReaction();
        newEditorView.destroy();
      };
    }
  }, [container, setEditorView]);

  return (
    <div
      css={css`
        width: 100%;
        height: calc(100% - 2rem);
        border: 2px solid ${editorCodeCorrect ? "transparent" : "red"};
      `}
      ref={(ref) => setContainer(ref)}
    ></div>
  );
});
