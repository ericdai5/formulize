import { useState } from "react";
import { observer } from "mobx-react-lite";
import { computationStore } from "./computation";

interface EvaluationFunctionPaneProps {
  className?: string;
}

const EvaluationFunctionPane = observer(({ className = "" }: EvaluationFunctionPaneProps) => {
  const code = computationStore.lastGeneratedCode;
  const engineType = computationStore.computationEngine;
  const [isExpanded, setIsExpanded] = useState(true);

  const getDisplayCode = () => {
    // For both engine types, use the generated code from the computation store
    if (code) {
      return code;
    }

    // If no code is available yet, show appropriate placeholder
    if (engineType === "symbolic-algebra") {
      return "// Symbolic Algebra engine will generate code when the formula is rendered";
    } else {
      return "// LLM will generate code when formula is rendered";
    }
  };

  return (
    <div className={`bg-white border rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-blue-50 to-white p-2 border-b border-blue-100 flex items-center justify-between">
        <h3 className="font-medium text-blue-800">Evaluation Function {engineType === "symbolic-algebra" ? "(Symbolic Algebra)" : "(LLM Generated)"}</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-500 text-xl hover:text-slate-700"
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="relative">
            <pre className="p-4 bg-gray-50 border rounded-md shadow-sm overflow-x-auto font-mono text-sm text-slate-800 max-h-72">
              {getDisplayCode()}
            </pre>
            {code && (
              <div className="absolute right-2 top-2">
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded"
                  title="Copy to clipboard"
                >
                  Copy code
                </button>
              </div>
            )}
          </div>

          {engineType === "symbolic-algebra" ? (
            <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
              <p className="text-gray-700">
                The symbolic algebra engine uses <strong>math.js</strong> to directly evaluate mathematical formulas
                through symbolic computations, without requiring code generation from an LLM.
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
              <p className="text-gray-700">
                The LLM engine generates JavaScript code on-the-fly to evaluate the formula based on its
                mathematical understanding. This allows handling complex equations without predefined rules.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default EvaluationFunctionPane;