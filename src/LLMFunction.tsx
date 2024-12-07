import { observer } from 'mobx-react-lite';
import { computationStore } from './computation';
import { useState } from 'react';

const LLMFunction = observer(() => {
  const code = computationStore.lastGeneratedCode;
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (!code) {
    return null;
  }

  return (
    <div className="h-full bg-slate-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-slate-700">
            Generated Evaluation Function
          </h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-500 hover:text-slate-700"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        
        {isExpanded && (
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
        )}
      </div>
    </div>
  );
});

export default LLMFunction;