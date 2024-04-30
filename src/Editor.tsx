import { Global, css } from "@emotion/react";
import { useEffect, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup";
import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";

import { formulaStore } from "./store";

export const Editor = observer(() => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [editorUpdateReactionDisposer, setEditorUpdateReactionDisposer] =
    useState<(() => void) | null>(null);

  useEffect(() => {
    if (container && !editorView) {
      setEditorView(
        new EditorView({
          state: EditorState.create({
            extensions: [basicSetup],
            doc: formulaStore.latexWithStyling,
          }),
          parent: container,
        })
      );
    }

    return () => editorView?.destroy();
  }, [container, setEditorView]);

  useEffect(() => {
    if (editorView && !editorUpdateReactionDisposer) {
      console.log("Configuring editor auto-sync reaction");
      const disposeReaction = reaction(
        () => formulaStore.latexWithStyling,
        (latex) => {
          console.log("Synchronizing editor with new formula", latex);

          editorView.dispatch(
            editorView.state.update({
              changes: {
                from: 0,
                to: editorView.state.doc.length,
                insert: latex,
              },
            })
          );
        }
      );
      setEditorUpdateReactionDisposer(() => disposeReaction);
    }
    return () => {
      console.log("Disposing editor auto-sync reaction");
      editorUpdateReactionDisposer?.();
    };
  }, [
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
