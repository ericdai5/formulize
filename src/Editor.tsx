import { Global, css } from "@emotion/react";
import { useEffect, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

import { checkFormulaCode, deriveAugmentedFormula } from "./FormulaTree";
import { formulaStore } from "./store";

export const Editor = observer(() => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [editorCodeCorrect, setEditorCodeCorrect] = useState(true);

  useEffect(() => {
    if (container && !editorView) {
      // Automatically update the formula when the editor code changes
      // TODO: This is way too noisy due to the LaTeX changing a lot from changing a single character
      // const codeUpdateListener = EditorView.updateListener.of((update) => {
      //   if (
      //     update.docChanged &&
      //     update.state.doc.toString() !== formulaStore.latexWithStyling
      //   ) {
      //     console.log("Editor code changed:", update);
      //     const newCode = update.state.doc.toString();
      //     if (checkFormulaCode(newCode)) {
      //       setEditorCorrectness(() => "correct");
      //       formulaStore.updateFormula(deriveAugmentedFormula(newCode));
      //     } else {
      //       setEditorCorrectness(() => "wrong");
      //     }
      //   }
      // });

      const newEditorView = new EditorView({
        state: EditorState.create({
          // extensions: [basicSetup, codeUpdateListener],
          extensions: [basicSetup],
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

          newEditorView.dispatch(
            newEditorView.state.update({
              changes: {
                from: 0,
                to: newEditorView.state.doc.length,
                insert: latex,
              },
            })
          );
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
