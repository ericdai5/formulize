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

import { FormulaLatexRange, StyledRange, UnstyledRange } from "./FormulaText";
import { checkFormulaCode, deriveAugmentedFormula } from "./FormulaTree";
import { formulaStore } from "./store";

type DecorationRange = { to: number; from: number; decoration: Decoration };

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

              &::after {
                content: "";
                position: absolute;
                z-index: ${nestingDepth};
                top: ${-4 + 2 * nestingDepth}px;
                left: 0;
                width: 100%;
                height: 2px;
                background-color: ${range.hints?.color || "black"};
              }
            `,
            }),
          },
        ]),
        offset,
      ];
    }
  };

  let offset = 0;
  let decorations = [];
  for (const range of styledRanges) {
    const [newDecorations, newOffset] = buildDecoration(range, offset, 0);
    offset = newOffset;
    decorations = decorations.concat(newDecorations);
  }
  decorations = decorations.sort((a, b) => a.from - b.from);
  for (const { from, to, decoration } of decorations) {
    builder.add(from, to, decoration);
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
  if (newSelection && !tr.docChanged) {
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
        tr.startState.field(styledRangeSelectionState) === 0
      ) {
        return {
          effects: [setStyledRangeSelection.of(1)],
        };
      } else if (
        // Empty selection
        newSelection.ranges[0].from === newSelection.ranges[0].to &&
        // where the cursor is about to move into the styled range
        newSelection.ranges[0].from === 4 &&
        // but the cursor is currently between the styled ranges
        tr.startState.field(styledRangeSelectionState) === 1
      ) {
        return {
          effects: [setStyledRangeSelection.of(2)],
        };
      } else if (
        // Empty selection
        newSelection.ranges[0].from === newSelection.ranges[0].to &&
        // where the cursor is about to move out of the styled range
        newSelection.ranges[0].from === 6 &&
        // but the cursor is currently inside the styled range
        tr.startState.field(styledRangeSelectionState) === 2
      ) {
        console.log("Cursor move out of styled range");
        return {
          effects: [setStyledRangeSelection.of(1)],
        };
      } else if (
        // Empty selection
        newSelection.ranges[0].from === newSelection.ranges[0].to &&
        // where the cursor is about to move out of the styled range
        newSelection.ranges[0].from === 6 &&
        // but the cursor is currently inside the styled range
        tr.startState.field(styledRangeSelectionState) === 1
      ) {
        console.log("Cursor move out of styled range");
        return {
          effects: [setStyledRangeSelection.of(0)],
        };
      }
    }
  }
  return tr;
});

const setStyledRangeSelection = StateEffect.define<number>();

const styledRangeSelectionState = StateField.define({
  create() {
    return 0;
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
