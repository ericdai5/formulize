import { useCallback, useEffect, useRef, useState } from "react";

import { Info, PanelRightClose, PanelRightOpen } from "lucide-react";

import Editor from "../../components/api-code-editor";
import ExampleSwitcher from "../../components/example-switcher";
import IconButton from "../../components/icon-button";
import Modal from "../../components/modal";
import { examples as formulaExamples } from "../../examples";
import {
  ExampleComponentKey,
  ExampleRenderer,
} from "../../examples/components";
import { FormulizeConfig } from "../../formulize";
import Formulize from "../../rendering/formulize";
import { executionStore } from "../../store/execution";
import { executeUserCode } from "../../util/code-executor";

type ExampleMode = "config" | "component";

export default function APIPage() {
  const [mode, setMode] = useState<ExampleMode>("config");
  const [selectedTemplate, setSelectedTemplate] = useState<
    keyof typeof formulaExamples | undefined
  >("kinetic2D");
  const [selectedComponentExample, setSelectedComponentExample] = useState<
    ExampleComponentKey | undefined
  >("kinetic2D");
  const [code, setCode] = useState<string>("");
  const codeByTemplateRef = useRef<Record<string, string>>({});
  const [isRendered, setIsRendered] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FormulizeConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

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
    if (
      mode === "config" &&
      selectedTemplate &&
      formulaExamples[selectedTemplate]
    ) {
      // Reset execution store when switching templates
      executionStore.reset();

      // Check if we have saved code for this template, otherwise use the default example
      const savedCode = codeByTemplateRef.current[selectedTemplate];
      const newFormula = savedCode || formulaExamples[selectedTemplate];

      setCode(newFormula);
    }
  }, [mode, selectedTemplate]);

  // Execute code when code changes (config mode only)
  useEffect(() => {
    if (mode === "config") {
      executeCode(code);
    }
  }, [mode, code, executeCode]);

  const handleModeChange = (newMode: ExampleMode) => {
    setMode(newMode);
    setError(null);
  };

  // Save code changes for the current template
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      if (selectedTemplate) {
        codeByTemplateRef.current = {
          ...codeByTemplateRef.current,
          [selectedTemplate]: newCode,
        };
      }
    },
    [selectedTemplate]
  );

  return (
    <div className="relative h-full flex">
      {/* Editor Panel */}
      <div
        className={`transition-all duration-300 ease-in-out border-r border-slate-200 ${
          isRendered ? "w-1/3" : "w-0"
        } overflow-hidden flex flex-col`}
      >
        <div className="min-w-[400px] h-full flex flex-col">
          <div className="p-4 border-b border-slate-200 flex-shrink-0">
            <ExampleSwitcher
              mode={mode}
              onModeChange={handleModeChange}
              onConfigSelect={setSelectedTemplate}
              onComponentSelect={setSelectedComponentExample}
              activeConfigKey={selectedTemplate}
              activeComponentKey={selectedComponentExample}
            />
          </div>
          {mode === "config" ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <Editor
                code={code}
                onChange={handleCodeChange}
                onRender={() => {}}
                error={error}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto p-4 bg-gray-50">
              <div className="text-sm text-gray-600">
                Component mode displays pre-built React components.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Panel */}
      <div
        className={`relative flex-1 transition-all duration-300 ease-in-out`}
      >
        {mode === "component" ? (
          // Component Mode - Replace canvas with component
          <>
            <div className="h-full overflow-auto p-8">
              {selectedComponentExample ? (
                <ExampleRenderer exampleKey={selectedComponentExample} />
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Select an example component to display
                </div>
              )}
            </div>
            <div className="absolute top-4 left-4 z-30">
              <IconButton
                size="lg"
                strokeWidth={1.5}
                icon={isRendered ? PanelRightOpen : PanelRightClose}
                alt="Toggle Editor"
                onClick={() => setIsRendered(!isRendered)}
                title="Toggle Editor Panel"
              />
            </div>
            <div className="absolute bottom-4 right-4 z-30">
              <IconButton
                size="lg"
                strokeWidth={1.5}
                icon={Info}
                alt="Team Members"
                onClick={() => setIsModalOpen(true)}
                title="Team Members"
              />
            </div>
          </>
        ) : (
          // Config Mode - Formulize Canvas
          <>
            <Formulize
              formulizeConfig={config || undefined}
              onRenderError={(formulizeError) => {
                // If there's a formulize error, it takes precedence over code execution errors
                if (formulizeError) {
                  setError(formulizeError);
                }
              }}
            />
            <div className="absolute top-4 left-4 z-30">
              <IconButton
                size="lg"
                strokeWidth={1.5}
                icon={isRendered ? PanelRightOpen : PanelRightClose}
                alt="Toggle Editor"
                onClick={() => setIsRendered(!isRendered)}
                title="Toggle Code Editor"
              />
            </div>
            <div className="absolute bottom-4 right-4 z-30">
              <IconButton
                size="lg"
                strokeWidth={1.5}
                icon={Info}
                alt="Team Members"
                onClick={() => setIsModalOpen(true)}
                title="Team Members"
              />
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Built by HCI @ Penn"
        maxWidth="max-w-md"
      >
        <div className="p-6">
          <ul className="space-y-3 text-lg">
            <li>Eric Dai</li>
            <li>Zain Khan</li>
            <li>Andrew Head</li>
            <li>Jeff Tao</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}
