import { useCallback, useEffect, useState } from "react";

import { Code } from "lucide-react";

import Editor from "../../components/api-code-editor";
import IconButton from "../../components/icon-button";
import TemplateSelector from "../../components/template-selector";
import { examples as formulaExamples } from "../../examples";
import { FormulizeConfig } from "../../formulize";
import Formulize from "../../rendering/formulize";
import { executeUserCode } from "../../util/code-executor";

export default function APIPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<
    keyof typeof formulaExamples | undefined
  >("kinetic2D");
  const [code, setCode] = useState<string>("");
  const [isRendered, setIsRendered] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FormulizeConfig | null>(null);

  // Execute code and extract config
  const executeCode = useCallback(async (codeToExecute: string) => {
    if (!codeToExecute || codeToExecute.trim() === "") {
      setConfig(null);
      setError(null);
      return;
    }
    try {
      setError(null);
      const extractedConfig = await executeUserCode(codeToExecute);
      setConfig(extractedConfig);
    } catch (err) {
      console.error("Code execution error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setConfig(null);
    }
  }, []);

  // Update formulize input when selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate && formulaExamples[selectedTemplate]) {
      const newFormula = formulaExamples[selectedTemplate];
      setCode(newFormula);
      executeCode(newFormula);
    }
  }, [selectedTemplate, executeCode]);

  // Execute code when code changes
  useEffect(() => {
    executeCode(code);
  }, [code, executeCode]);

  return (
    <div className="relative h-full flex">
      {/* Editor Panel */}
      <div
        className={`transition-all duration-300 ease-in-out border-r border-slate-200 ${
          isRendered ? "w-1/3" : "w-0"
        } overflow-hidden flex flex-col`}
      >
        {isRendered && (
          <div className="p-4 flex gap-3 border-b border-slate-200">
            <TemplateSelector
              onTemplateSelect={setSelectedTemplate}
              activeTemplate={selectedTemplate}
            />
            <IconButton
              icon={Code}
              alt="Toggle Editor"
              onClick={() => setIsRendered(!isRendered)}
              title="Toggle Code Editor"
            />
          </div>
        )}
        <div className="flex-1 min-h-0">
          <Editor
            code={code}
            onChange={setCode}
            onRender={() => {}}
            error={error}
          />
        </div>
      </div>

      {/* Formulize Panel */}
      <div
        className={`relative flex-1 transition-all duration-300 ease-in-out`}
      >
        <Formulize
          formulizeConfig={config || undefined}
          onRenderError={(formulizeError) => {
            // If there's a formulize error, it takes precedence over code execution errors
            if (formulizeError) {
              setError(formulizeError);
            }
          }}
        />
        {!isRendered && (
          <div className="absolute top-4 left-4 z-30">
            <IconButton
              icon={Code}
              alt="Toggle Editor"
              onClick={() => setIsRendered(!isRendered)}
              title="Toggle Code Editor"
            />
          </div>
        )}
      </div>
    </div>
  );
}
