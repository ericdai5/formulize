import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import { useState, useEffect } from "react";

import { examples as formulaExamples } from "../examples";
import TemplateSelector from "./template-selector";

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
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof formulaExamples | undefined>();

  // Detect which template matches the current input
  useEffect(() => {
    const matchingTemplate = Object.keys(formulaExamples).find(
      (key) => formulaExamples[key as keyof typeof formulaExamples] === formulizeInput
    ) as keyof typeof formulaExamples | undefined;
    setActiveTemplate(matchingTemplate);
  }, [formulizeInput]);

  const handleExampleClick = (example: keyof typeof formulaExamples) => {
    const newFormula = formulaExamples[example];
    setActiveTemplate(example);
    onInputChange(newFormula);
    onRender(newFormula);
  };

  const handleCodeMirrorChange = (value: string) => {
    onInputChange(value);
  };

  return (
    <div className="p-4 flex flex-col gap-3 border-t border-slate-200 h-full">
      <TemplateSelector onTemplateSelect={handleExampleClick} activeTemplate={activeTemplate} />
      <div className="w-full h-full border bg-slate-50 rounded-xl overflow-auto scrollbar-hide">
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
      </div>
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
    </div>
  );
};

export default FormulaCodeEditor;
