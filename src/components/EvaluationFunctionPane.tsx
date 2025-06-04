import { observer } from "mobx-react-lite";

import { computationStore } from "../computation";

interface EvaluationFunctionPaneProps {
  className?: string;
}

const engineDescriptions = {
  "symbolic-algebra": {
    title: "Symbolic Algebra",
    description:
      "The symbolic algebra engine uses math.js to directly evaluate mathematical formulas through symbolic computations, without requiring code generation from an LLM.",
  },
  llm: {
    title: "LLM Generated",
    description:
      "The LLM engine generates JavaScript code on-the-fly to evaluate the formula based on its mathematical understanding. This allows handling complex equations without predefined rules.",
  },
};

const EvaluationFunctionPane = observer(
  ({ className = "" }: EvaluationFunctionPaneProps) => {
    const code = computationStore.lastGeneratedCode;
    const engineType = computationStore.computationEngine;

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

    const currentEngine =
      engineDescriptions[engineType as keyof typeof engineDescriptions] ||
      engineDescriptions["llm"];

    return (
      <div className={`overflow-hidden ${className}`}>
        <div className="pt-4 px-4 text-lg">
          Evaluation Function: {currentEngine.title}
        </div>

        <div className="p-4">
          <div className="relative">
            <pre className="p-4 bg-gray-50 border rounded-md overflow-x-auto font-mono text-sm text-slate-800 max-h-72">
              {getDisplayCode()}
            </pre>
            {code && (
              <div className="absolute right-2 top-2">
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="px-2 py-1 text-xs border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded"
                  title="Copy to clipboard"
                >
                  Copy code
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded text-sm">
            <p className="text-gray-700">{currentEngine.description}</p>
          </div>
        </div>
      </div>
    );
  }
);

export default EvaluationFunctionPane;
