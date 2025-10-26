import React, { useState } from "react";

import { ChevronDown, ChevronUp, Code, Component } from "lucide-react";

import { examples as configExamples, exampleDisplayNames } from "../examples";
import { ExampleComponentKey } from "../examples/components";

type ExampleMode = "config" | "component";

interface ExampleSwitcherProps {
  mode: ExampleMode;
  onModeChange: (mode: ExampleMode) => void;
  onConfigSelect?: (key: keyof typeof configExamples) => void;
  onComponentSelect?: (key: ExampleComponentKey) => void;
  activeConfigKey?: keyof typeof configExamples;
  activeComponentKey?: ExampleComponentKey;
}

export const ExampleSwitcher: React.FC<ExampleSwitcherProps> = ({
  mode,
  onModeChange,
  onConfigSelect,
  onComponentSelect,
  activeConfigKey,
  activeComponentKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getActiveLabel = () => {
    if (mode === "config" && activeConfigKey) {
      return exampleDisplayNames[activeConfigKey];
    }
    if (mode === "component" && activeComponentKey) {
      return exampleDisplayNames[activeComponentKey];
    }
    return "Select Example";
  };

  return (
    <div className="relative">
      {/* Container for toggle and dropdown in a row */}
      <div className="flex items-center gap-3">
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

        {/* Figma-style Mode Toggle */}
        <div className="relative inline-flex p-0.5 bg-white border border-slate-200 shadow-sm rounded-xl">
          {/* Sliding background indicator */}
          <div
            className={`absolute top-0.5 bottom-0.5 left-0.5 w-8 bg-slate-100 rounded-lg transition-transform duration-200 ease-out ${
              mode === "component" ? "translate-x-8" : "translate-x-0"
            }`}
          />

          {/* Config Mode Button */}
          <button
            onClick={() => onModeChange("config")}
            title="Config Mode"
            className={`relative flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-200 z-10 ${
              mode === "config"
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Code size={16} strokeWidth={2} />
          </button>

          {/* Component Mode Button */}
          <button
            onClick={() => onModeChange("component")}
            title="Component Mode"
            className={`relative flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-200 z-10 ${
              mode === "component"
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Component size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 max-h-96 bg-white border border-slate-200 rounded-xl shadow-md z-20 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {mode === "config" ? (
                // Config-based examples
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
              ) : (
                // Component-based examples
                <div className="flex flex-col">
                  {Object.keys(configExamples)
                    .filter((key) => key in exampleDisplayNames)
                    .map((key) => {
                      const exampleKey = key as ExampleComponentKey;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            onComponentSelect?.(exampleKey);
                            setIsOpen(false);
                          }}
                          className={`px-3 py-2 text-sm text-left transition-colors ${
                            activeComponentKey === exampleKey
                              ? "bg-purple-50 text-purple-700"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {
                            exampleDisplayNames[
                              exampleKey as keyof typeof exampleDisplayNames
                            ]
                          }
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExampleSwitcher;
