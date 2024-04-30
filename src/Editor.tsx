import { Global, css } from "@emotion/react";
import { useEffect, useState } from "react";

import { reaction } from "mobx";
import { toJS } from "mobx";
import { observer } from "mobx-react-lite";

import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

import { formulaStore } from "./store";

export const Editor = observer(() => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [editorUpdateReactionDisposer, setEditorUpdateReactionDisposer] =
    useState<(() => void) | null>(null);

  useEffect(() => {
    if (container && !editorView) {
      const state = EditorState.create({
        extensions: [basicSetup],
        doc: formulaStore.latexWithStyling,
      });
      setEditorState(state);

      setEditorView(
        new EditorView({
          state,
          parent: container,
        })
      );
    }

    return () => editorView?.destroy();
  }, [container, setEditorState, setEditorView]);

  useEffect(() => {
    if (editorState && editorView && !editorUpdateReactionDisposer) {
      console.log("Configuring editor auto-sync reaction");
      const disposeReaction = reaction(
        () => formulaStore.latexWithStyling,
        (latex) => {
          console.log(
            "Synchronizing editor with new formula",
            latex,
            editorState
          );
          // TODO: For some reason CodeMirror isn't updating after the first change
          setEditorState((currentEditorState) => {
            if (!currentEditorState) {
              return currentEditorState;
            }

            const transaction = currentEditorState.update({
              changes: {
                from: 0,
                to: editorState.doc.length,
                insert: latex,
              },
            });
            editorView.dispatch(transaction);
            return transaction.state;
          });
        }
      );
      setEditorUpdateReactionDisposer(() => disposeReaction);
    }

    return () => {
      console.log("Disposing editor auto-sync reaction");
      editorUpdateReactionDisposer?.();
    };
  }, [
    editorState,
    editorView,
    editorUpdateReactionDisposer,
    setEditorUpdateReactionDisposer,
  ]);

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
          width: 100%;
          height: 100%;
        `}
        ref={(ref) => setContainer(ref)}
      ></div>
    </>
  );
});
