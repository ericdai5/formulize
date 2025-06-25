import React from "react";

/**
 * CodeMirror utility functions for code highlighting and manipulation
 */

/**
 * Highlights a specific range of code in a CodeMirror editor
 * @param codeMirrorRef - React ref to the CodeMirror component
 * @param start - Start character position
 * @param end - End character position
 */
export const highlightCode = (
  codeMirrorRef: React.RefObject<any>,
  start: number,
  end: number
) => {
  if (codeMirrorRef.current) {
    const view = codeMirrorRef.current.view;
    if (view) {
      // Convert character positions to CodeMirror positions
      const doc = view.state.doc;
      const startPos = Math.min(start, doc.length);
      const endPos = Math.min(end, doc.length);
      // Set selection in CodeMirror
      view.dispatch({
        selection: { anchor: startPos, head: endPos },
        scrollIntoView: true,
      });
    }
  }
};
