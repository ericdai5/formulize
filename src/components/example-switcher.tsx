import React, { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import { examples as configExamples, exampleDisplayNames } from "../examples";

interface ExampleSwitcherProps {
  onConfigSelect?: (key: keyof typeof configExamples) => void;
  activeConfigKey?: keyof typeof configExamples;
}

export const ExampleSwitcher: React.FC<ExampleSwitcherProps> = ({
  onConfigSelect,
  activeConfigKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getActiveLabel = () => {
    if (activeConfigKey) {
      return exampleDisplayNames[activeConfigKey];
    }
    return "Select Example";
  };

  return (
    <div className="relative">
      {/* Example Selector */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-2 border shadow-sm border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-sm text-slate-950 gap-2 min-w-[200px]"
      >
        {getActiveLabel()}
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 max-h-96 bg-white border border-slate-200 rounded-xl shadow-md z-20 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <div className="flex flex-col">
                {Object.keys(configExamples).map((key) => {
                  const exampleKey = key as keyof typeof configExamples;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        onConfigSelect?.(exampleKey);
                        setIsOpen(false);
                      }}
                      className={`px-3 py-2 text-sm text-left transition-colors ${
                        activeConfigKey === exampleKey
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {exampleDisplayNames[exampleKey]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExampleSwitcher;
