import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ChevronLeft,
  ChevronRight,
  Info,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

import { examples as formulaExamples } from "./examples";
import { FormulizeConfig } from "./formulize";
import Editor from "./internal/api-code-editor";
import ExampleSwitcher from "./internal/example-switcher";
import PlaygroundCanvas from "./internal/playground";
import IconButton from "./ui/icon-button";
import Modal from "./ui/modal";
import { executeUserCode } from "./util/code-executor";

export default function APIPage() {
  const navigate = useNavigate();
  const { exampleId } = useParams<{ exampleId: string }>();

  // Get example keys for navigation
  const exampleKeys = useMemo(
    () => Object.keys(formulaExamples) as (keyof typeof formulaExamples)[],
    []
  );

  // Derive selected template from URL parameter
  const selectedTemplate = useMemo(() => {
    if (exampleId && exampleId in formulaExamples) {
      return exampleId as keyof typeof formulaExamples;
    }
    return exampleKeys[0];
  }, [exampleId, exampleKeys]);

  const [code, setCode] = useState<string>("");
  const codeByTemplateRef = useRef<Record<string, string>>({});
  const [isRendered, setIsRendered] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<FormulizeConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const currentIndex = useMemo(
    () => (selectedTemplate ? exampleKeys.indexOf(selectedTemplate) : -1),
    [selectedTemplate, exampleKeys]
  );

  // Navigate to example by updating the URL
  const setSelectedTemplate = useCallback(
    (template: keyof typeof formulaExamples | undefined) => {
      if (template) {
        navigate(`/examples/${template}`);
      }
    },
    [navigate]
  );

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      navigate(`/examples/${exampleKeys[currentIndex - 1]}`);
    } else if (currentIndex === 0) {
      // Wrap to last
      navigate(`/examples/${exampleKeys[exampleKeys.length - 1]}`);
    }
  }, [currentIndex, exampleKeys, navigate]);

  const goToNext = useCallback(() => {
    if (currentIndex < exampleKeys.length - 1) {
      navigate(`/examples/${exampleKeys[currentIndex + 1]}`);
    } else if (currentIndex === exampleKeys.length - 1) {
      // Wrap to first
      navigate(`/examples/${exampleKeys[0]}`);
    }
  }, [currentIndex, exampleKeys, navigate]);

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

  // Memoized callback to prevent FormulizeProvider re-initialization on parent re-renders
  const handleRenderError = useCallback((formulizeError: string | null) => {
    // If there's a formulize error, it takes precedence over code execution errors
    if (formulizeError) {
      setError(formulizeError);
    }
  }, []);

  return (
    <div className="relative h-full flex">
      {/* Editor Panel */}
      <div
        className={`transition-all duration-300 ease-in-out border-r border-slate-200 ${
          isRendered ? "w-1/3" : "w-0"
        } overflow-hidden flex flex-col`}
      >
        <div className="min-w-[400px] h-full flex flex-col">
          <div className="p-2.5 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <ExampleSwitcher
                onConfigSelect={setSelectedTemplate}
                activeConfigKey={selectedTemplate}
              />
              <div className="flex items-center gap-2">
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
                <IconButton
                  size="lg"
                  icon={PanelRightOpen}
                  alt="Toggle Editor"
                  onClick={() => setIsRendered(!isRendered)}
                  title="Toggle Code Editor"
                  tooltipPosition="right"
                />
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
        <PlaygroundCanvas
          formulizeConfig={config || undefined}
          onRenderError={handleRenderError}
        />
        {!isRendered && (
          <div className="absolute top-2.5 left-2.5 z-30">
            <IconButton
              size="lg"
              icon={PanelRightClose}
              alt="Toggle Editor"
              onClick={() => setIsRendered(!isRendered)}
              title="Toggle Code Editor"
              tooltipPosition="right"
            />
          </div>
        )}
        <div className="absolute bottom-4 right-4 z-30">
          <IconButton
            size="lg"
            strokeWidth={1.5}
            icon={Info}
            alt="Credits"
            onClick={() => setIsModalOpen(true)}
            title="Credits"
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
