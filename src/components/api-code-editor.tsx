import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";

interface FormulaCodeEditorProps {
  formulizeInput: string;
  onInputChange: (value: string) => void;
  onRender: (value?: string) => void;
  error: string | null;
}

const FormulaCodeEditor = ({
  formulizeInput,
  onInputChange,
  onRender,
  error,
}: FormulaCodeEditorProps) => {
  const handleCodeMirrorChange = (value: string) => {
    onInputChange(value);
  };

  return (
    <div className="w-full h-full border border-slate-200 rounded-xl overflow-auto scrollbar-hide">
      <CodeMirror
        value={formulizeInput}
        onChange={handleCodeMirrorChange}
        onBlur={() => onRender()}
        extensions={[javascript()]}
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
      {error && <div className="p-3 bg-red-100 text-red-700"> {error}</div>}
    </div>
  );
};

export default FormulaCodeEditor;
