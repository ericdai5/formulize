import { css as classnames } from "@emotion/css";
import { Global, css } from "@emotion/react";
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

import { checkFormulaCode, deriveAugmentedFormula } from "./FormulaTree";
import { formulaStore } from "./store";

const styledRanges = (view: EditorView) => {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  const active = view.state.field(styledRangeSelectionState);
  console.log("Active", active);
  if (active) {
    builder.add(
      0,
      5,
      Decoration.mark({
        class: classnames`
            position: relative;

            &::after {
              content: "";
              position: absolute;
              top: -5px;
              left: 0;
              width: 100%;
              height: 5px;
              background-color: red;
            }
        `,
      })
    );
  } else {
    builder.add(
      0,
      5,
      Decoration.mark({
        class: classnames`
            position: relative;

            &::after {
              content: "";
              position: absolute;
              top: -5px;
              left: 0;
              width: 100%;
              height: 2px;
              background-color: red;
            }
        `,
      })
    );
  }

  return builder.finish();
};

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

const styledRangeCursorExtension = EditorState.transactionFilter.of((tr) => {
  const newSelection = tr.selection;
  if (newSelection) {
    const prevSelection = tr.startState.selection;
    if (newSelection.ranges.length === 1 && prevSelection.ranges.length === 1) {
      console.log(
        "Cursor move",
        newSelection.ranges[0].from,
        newSelection.ranges[0].to
      );
      if (
        // Empty selection
        newSelection.ranges[0].from === newSelection.ranges[0].to &&
        // where the cursor is about to move into the styled range
        newSelection.ranges[0].from === 4 &&
        // but the cursor is currently outside the styled range
        tr.startState.field(styledRangeSelectionState) === false
      ) {
        console.log("Cursor move into styled range");
        return {
          effects: [setStyledRangeSelection.of(true)],
        };
      } else if (
        // Empty selection
        newSelection.ranges[0].from === newSelection.ranges[0].to &&
        // where the cursor is about to move out of the styled range
        newSelection.ranges[0].from === 6 &&
        // but the cursor is currently inside the styled range
        tr.startState.field(styledRangeSelectionState) === true
      ) {
        console.log("Cursor move out of styled range");
        return {
          effects: [setStyledRangeSelection.of(false)],
        };
      }
    }
  }
  return tr;
});

const setStyledRangeSelection = StateEffect.define<boolean>();

const styledRangeSelectionState = StateField.define({
  create() {
    return false;
  },

  update(value, tr) {
    console.log("Selection state update", value, tr);
    for (const effect of tr.effects) {
      if (effect.is(setStyledRangeSelection)) {
        console.log("Setting selection state to", effect.value);
        value = effect.value;
      }
    }
    return value;
  },
});

export const Editor = observer(() => {
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
            styledRangeViewExtension,
            styledRangeSelectionState,
            styledRangeCursorExtension,
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
      ></div>
      <div
        css={css`
          width: 100%;
          height: 100%;
          border: 2px solid ${editorCodeCorrect ? "transparent" : "red"};
        `}
        ref={(ref) => setContainer(ref)}
      ></div>
    </>
  );
});
