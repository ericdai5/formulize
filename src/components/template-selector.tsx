import { exampleDisplayNames, examples as formulaExamples } from "../examples";

interface TemplateSelectorProps {
  onTemplateSelect: (template: keyof typeof formulaExamples) => void;
  activeTemplate?: keyof typeof formulaExamples;
}

const TemplateSelector = ({
  onTemplateSelect,
  activeTemplate,
}: TemplateSelectorProps) => {
  return (
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
            onClick={() => onTemplateSelect(example)}
            className={`px-3 py-1 border rounded-lg text-sm flex-shrink-0 transition-colors duration-200 ${
              activeTemplate === example
                ? "border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-950 hover:bg-slate-100"
            }`}
          >
            {exampleDisplayNames[example]}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;
