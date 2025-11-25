import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Info,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

import Editor from "../../components/api-code-editor";
import ExampleSwitcher from "../../components/example-switcher";
import IconButton from "../../components/icon-button";
import Modal from "../../components/modal";
import { examples as formulaExamples } from "../../examples";
import { FormulizeConfig } from "../../formulize";
import Formulize from "../../rendering/formulize";
import { executionStore } from "../../store/execution";
import { executeUserCode } from "../../util/code-executor";

export default function APIPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<
    keyof typeof formulaExamples | undefined
  >("kinetic2D");
  const [code, setCode] = useState<string>("");
  const codeByTemplateRef = useRef<Record<string, string>>({});
  const [isRendered, setIsRendered] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FormulizeConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Get example keys for navigation
  const exampleKeys = useMemo(
    () => Object.keys(formulaExamples) as (keyof typeof formulaExamples)[],
    []
  );

  const currentIndex = useMemo(
    () => (selectedTemplate ? exampleKeys.indexOf(selectedTemplate) : -1),
    [selectedTemplate, exampleKeys]
  );

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedTemplate(exampleKeys[currentIndex - 1]);
    } else if (currentIndex === 0) {
      // Wrap to last
      setSelectedTemplate(exampleKeys[exampleKeys.length - 1]);
    }
  }, [currentIndex, exampleKeys]);

  const goToNext = useCallback(() => {
    if (currentIndex < exampleKeys.length - 1) {
      setSelectedTemplate(exampleKeys[currentIndex + 1]);
    } else if (currentIndex === exampleKeys.length - 1) {
      // Wrap to first
      setSelectedTemplate(exampleKeys[0]);
    }
  }, [currentIndex, exampleKeys]);

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
      // Reset execution store when switching templates
      executionStore.reset();

      // Check if we have saved code for this template, otherwise use the default example
      const savedCode = codeByTemplateRef.current[selectedTemplate];
      const newFormula = savedCode || formulaExamples[selectedTemplate];

      setCode(newFormula);
    }
  }, [selectedTemplate]);

  // Execute code when code changes
  useEffect(() => {
    executeCode(code);
  }, [code, executeCode]);

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
            <div className="flex items-center justify-between">
              <ExampleSwitcher
                onConfigSelect={setSelectedTemplate}
                activeConfigKey={selectedTemplate}
              />
              <div className="flex items-center border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={goToPrevious}
                  className="p-2.5 hover:bg-slate-50 transition-colors border-r border-slate-200"
                  title="Previous Example"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={goToNext}
                  className="p-2.5 hover:bg-slate-50 transition-colors"
                  title="Next Example"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <Editor
              code={code}
              onChange={handleCodeChange}
              onRender={() => {}}
              error={error}
            />
          </div>
        </div>
      </div>

      {/* Main Content Panel */}
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
