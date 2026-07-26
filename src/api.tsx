import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { observer } from "mobx-react-lite";

import {
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Sparkles,
  Undo2,
} from "lucide-react";

import { Provider } from "./core";
import { examples as formulaExamples } from "./examples";
import { Config } from "./formulize";
import Editor, { EditorHandle } from "./internal/api-code-editor";
import ExampleSwitcher from "./internal/example-switcher";
import PlaygroundCanvas from "./internal/playground";
import { debugStore } from "./store/debug";
import IconButton from "./ui/icon-button";
import { executeUserCode } from "./util/code-executor";

const APIPage = observer(() => {
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

  const [isRendered, setIsRendered] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [editorWidth, setEditorWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const editorRef = useRef<EditorHandle>(null);

  // Navigate to example by updating the URL
  const setSelectedTemplate = useCallback(
    (template: keyof typeof formulaExamples | undefined) => {
      if (template) {
        navigate(`/examples/${template}`);
      }
    },
    [navigate]
  );

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

  // Update debugStore when selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate && formulaExamples[selectedTemplate]) {
      debugStore.setSelectedTemplate(
        selectedTemplate,
        formulaExamples[selectedTemplate]
      );
    }
  }, [selectedTemplate]);

  // Execute code when debugStore.code changes (observer triggers re-render)
  const code = debugStore.code;
  useEffect(() => {
    executeCode(code);
  }, [code, executeCode]);

  // Memoized callback to prevent Provider re-initialization on parent re-renders
  const handleRenderError = useCallback((renderError: string | null) => {
    if (renderError) {
      setError(renderError);
    }
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = editorWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = moveEvent.clientX - startX;
        const containerWidth =
          containerRef.current?.getBoundingClientRect().width ?? 1200;
        const newWidth = Math.min(
          Math.max(300, startWidth + delta),
          containerWidth - 300
        );
        setEditorWidth(newWidth);
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [editorWidth]
  );

  return (
    <div ref={containerRef} className="relative h-full flex">
      {/* Editor Panel */}
      <div
        className={`${isRendered ? "border-r border-slate-200" : ""} overflow-hidden flex flex-col flex-shrink-0`}
        style={{ width: isRendered ? editorWidth : 0, transition: isRendered ? undefined : "width 0.3s ease-in-out" }}
      >
        <div className="min-w-[300px] h-full flex flex-col">
          <div className="p-2.5 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <ExampleSwitcher
                onConfigSelect={setSelectedTemplate}
                activeConfigKey={selectedTemplate}
              />
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => editorRef.current?.undo()}
                    className="p-2.5 hover:bg-slate-50 transition-colors border-r border-slate-200"
                    title="Undo"
                  >
                    <Undo2 className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => editorRef.current?.redo()}
                    className="p-2.5 hover:bg-slate-50 transition-colors"
                    title="Redo"
                  >
                    <Redo2 className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <IconButton
                  size="lg"
                  icon={Sparkles}
                  alt="Format Code"
                  onClick={() => debugStore.toggleAutoFormat()}
                  title="Format Code"
                  tooltipPosition="right"
                  isActive={debugStore.autoFormat}
                />
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
              ref={editorRef}
              code={debugStore.code}
              onChange={(newCode) => debugStore.setCode(newCode)}
              onRender={() => {}}
              error={error}
            />
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      {isRendered && (
        <div className="relative flex-shrink-0 w-0">
          <div
            onMouseDown={handleResizeStart}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-col-resize group flex items-center justify-center w-4 h-12"
          >
            <div className="w-1.5 h-8 rounded-full bg-white border border-slate-200 group-hover:bg-slate-100 group-hover:border-slate-300 transition-colors shadow-sm" />
          </div>
        </div>
      )}

      {/* Main Content Panel */}
      <div className="relative flex-1 min-w-0">
        <Provider
          config={config || undefined}
          onError={handleRenderError}
        >
          <PlaygroundCanvas />
        </Provider>
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
      </div>
    </div>
  );
});

export default APIPage;
