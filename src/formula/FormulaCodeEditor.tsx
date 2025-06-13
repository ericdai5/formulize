import { exampleDisplayNames, examples as formulaExamples } from "../examples";

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
  // Handler for example button clicks
  const handleExampleClick = (example: keyof typeof formulaExamples) => {
    const newFormula = formulaExamples[example];
    onInputChange(newFormula);
    onRender(newFormula); // Pass the new formula directly to render
  };

  return (
    <div className="p-4 flex flex-col gap-3 border-t border-slate-200 h-full">
      <div className="flex flex-row gap-0 border border-slate-200 rounded-xl">
        <div className="text-sm text-slate-950 py-1 px-3 border-r border-slate-200 h-full flex items-center">
          Templates
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide p-2">
          {(
            Object.keys(formulaExamples) as Array<keyof typeof formulaExamples>
          ).map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1 border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-950 rounded-lg hover:bg-slate-100 text-sm flex-shrink-0"
            >
              {exampleDisplayNames[example]}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={formulizeInput}
        onChange={(e) => onInputChange(e.target.value)}
        onBlur={() => onRender()}
        className="w-full p-4 border bg-slate-50 rounded-xl font-mono text-sm h-full"
      />

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
    </div>
  );
};

export default FormulaCodeEditor;
