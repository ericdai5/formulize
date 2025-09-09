import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";

import { createAutocompletion } from "../util/codemirror";

interface Editor {
  code: string;
  onChange: (value: string) => void;
  onRender: (value?: string) => void;
  error: string | null;
}

const Editor = ({ code, onChange, onRender, error }: Editor) => {
  const handleCodeMirrorChange = (value: string) => {
    onChange(value);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto scrollbar-hide">
        <CodeMirror
          value={code}
          onChange={handleCodeMirrorChange}
          onBlur={() => onRender()}
          extensions={[javascript(), createAutocompletion()]}
          theme="light"
          style={{
            fontSize: "14px",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightSelectionMatches: false,
            searchKeymap: true,
          }}
        />
      </div>
      {error && (
        <div className="flex-shrink-0 p-3 bg-red-100 text-red-700 border-t border-red-200 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default Editor;
