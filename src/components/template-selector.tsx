import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import { exampleDisplayNames, examples as formulaExamples } from "../examples";

interface TemplateSelectorProps {
  onTemplateSelect: (template: keyof typeof formulaExamples) => void;
  activeTemplate?: keyof typeof formulaExamples;
}

const TemplateSelector = ({
  onTemplateSelect,
  activeTemplate,
}: TemplateSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTemplateSelect = (template: keyof typeof formulaExamples) => {
    onTemplateSelect(template);
    setIsOpen(false);
  };

  const activeTemplateName = activeTemplate
    ? exampleDisplayNames[activeTemplate]
    : "Select Template";

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-2 border shadow-sm border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-sm text-slate-950 gap-2"
      >
        {activeTemplateName}
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Dropdown Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 mt-1 w-64 max-h-96 bg-white border border-slate-200 rounded-xl shadow-md shadow-sky-100 z-20 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <div className="flex flex-col">
                {(
                  Object.keys(formulaExamples) as Array<
                    keyof typeof formulaExamples
                  >
                ).map((example) => (
                  <button
                    key={example}
                    onClick={() => handleTemplateSelect(example)}
                    className={`px-3 py-2 border-b border-slate-200 text-sm text-left transition-colors duration-200 ${
                      activeTemplate === example
                        ? "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                        : "border-slate-200 bg-white text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                    }`}
                  >
                    {exampleDisplayNames[example]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TemplateSelector;
