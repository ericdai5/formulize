import { useState } from "react";

import { observer } from "mobx-react-lite";

import { computationStore } from "./computation";

const LLMFunction = observer(() => {
  const code = computationStore.lastGeneratedCode;
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="h-fit max-h-full overflow-y-auto bg-white">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base text-black">
            Generated Evaluation Function
          </h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 text-xl hover:text-slate-700"
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>

        {isExpanded && code ? (
          <div className="relative">
            <pre className="p-4 bg-white border rounded-md shadow-sm overflow-x-auto font-mono text-sm text-slate-800">
              {code}
            </pre>

            <div className="absolute right-2 top-2 flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                title="Copy to clipboard"
              >
                Copy code
              </button>
            </div>
          </div>
        ) : isExpanded ? (
          <div className="h-full flex items-center pt-4">
            <p className="text-base text-slate-400">
              No generated function yet.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export default LLMFunction;
