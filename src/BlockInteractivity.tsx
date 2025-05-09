import { useCallback, useEffect, useRef, useState } from "react";

import { reaction } from "mobx";
import { observer } from "mobx-react-lite";

import { computationStore } from "./computation";
import { formulaStore } from "./store";

declare global {
  interface Window {
    MathJax: {
      startup: {
        promise: Promise<void>;
      };
      typesetPromise: (elements: HTMLElement[]) => Promise<void>;
      typesetClear: (elements: HTMLElement[]) => void;
    };
  }
}

const BlockInteractivity = observer(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMathJax = async () => {
      if (!window.MathJax) {
        console.error("MathJax not loaded");
        return;
      }

      try {
        await window.MathJax.startup.promise;
        setIsInitialized(true);
        // Set initial formula when MathJax is ready
        const latex = formulaStore.latexWithoutStyling;
        if (latex) {
          console.log("🔍 Setting initial formula:", latex);
          await computationStore.setFormula(latex);
        }
      } catch (error) {
        console.error("Error initializing MathJax:", error);
      }
    };

    initializeMathJax();
  }, []);

  const renderFormula = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const latex = formulaStore.latexWithoutStyling;
      if (!latex) return;

      console.log("🔍 Starting renderFormula with latex:", latex);
      console.log(
        "🔍 Current computation store state:",
        Array.from(computationStore.variables.entries()).map(([id, v]) => ({
          id,
          type: v.type,
          value: v.value,
          error: v.error,
        }))
      );

      // Store the original LaTeX for computation
      const originalLatex = latex;

      // Process the LaTeX to include interactive elements (for display only)
      const processedLatex = latex.replace(/([a-zA-Z])/g, (match) => {
        const varId = `var-${match}`;
        const variable = computationStore.variables.get(varId);

        if (!variable) {
          console.log(`⚠️ Variable not found for ${varId}`);
          return match;
        }

        console.log(`🔍 Processing variable ${varId}:`, {
          type: variable.type,
          value: variable.value,
          error: variable.error,
        });

        const value = variable.value;
        const type = variable.type;

        if (type === "fixed") {
          // For display, replace with value
          return value.toString();
        }

        if (type === "slidable") {
          return `\\cssId{var-${match}}{\\class{interactive-var-slidable}{${match}: ${value.toFixed(1)}}}`;
        }

        if (type === "dependent") {
          console.log(
            `🔍 Rendering dependent variable ${varId} with value:`,
            value
          );
          return `\\cssId{var-${match}}{\\class{interactive-var-dependent}{${match}: ${value.toFixed(1)}}}`;
        }

        return `\\class{interactive-var-${type}}{${match}}`;
      });

      console.log("🔍 Processed LaTeX:", processedLatex);

      // Clear previous MathJax content
      window.MathJax.typesetClear([containerRef.current]);

      // Update content and typeset
      containerRef.current.innerHTML = `\\[${processedLatex}\\]`;
      await window.MathJax.typesetPromise([containerRef.current]);

      // Make sure to set the original formula for computation
      console.log("🔍 Setting initial formula for computation:", originalLatex);
      await computationStore.setFormula(originalLatex);

      // Add interaction handlers
      setupInteractionHandlers();
    } catch (error) {
      console.error("Error rendering formula:", error);
    }
  }, []);

  useEffect(() => {
    const disposer = reaction(
      () => ({
        latex: formulaStore.latexWithoutStyling,
        // Watch for changes in both variable values and types
        variables: Array.from(computationStore.variables.entries()).map(
          ([id, v]) => ({
            id,
            type: v.type,
            value: v.value,
          })
        ),
        variableTypesChanged: computationStore.variableTypesChanged,
      }),
      async () => {
        if (!isInitialized || !containerRef.current) return;
        await renderFormula();
      }
    );

    return () => disposer();
  }, [isInitialized, renderFormula]);

  const setupInteractionHandlers = () => {
    if (!containerRef.current) return;

    const slidableElements = containerRef.current.querySelectorAll(
      ".interactive-var-slidable"
    );

    slidableElements.forEach((element) => {
      let isDragging = false;
      let startY = 0;
      let startValue = 0;
      const SENSITIVITY = 0.5;

      const handleMouseMove = async (e: MouseEvent) => {
        if (!isDragging) return;

        const deltaY = startY - e.clientY;
        const newValue = startValue + deltaY * SENSITIVITY;
        const varMatch = element.id.match(/^var-([a-zA-Z])$/);
        if (!varMatch) return;
        const symbol = varMatch[1];

        const clampedValue = Math.max(-100, Math.min(100, newValue));

        // Update the computation store
        const varId = `var-${symbol}`;
        console.log(`🔍 Updating slidable variable ${varId} to:`, clampedValue);

        // Log the formula before update
        console.log("🔍 Current formula:", formulaStore.latexWithoutStyling);
        console.log(
          "🔍 Dependent variables before update:",
          Array.from(computationStore.variables.entries())
            .filter(([_, v]) => v.type === "dependent")
            .map(([id, v]) => ({ id, value: v.value }))
        );

        // Update the value
        computationStore.setValue(varId, clampedValue);

        // Ensure formula is set for computation using the original LaTeX
        // NOT the processed one with CSS classes
        console.log("🔍 Setting formula for computation:", originalLatex);
        await computationStore.setFormula(originalLatex);

        // Log the state after update
        console.log(
          "🔍 Computation store state after update:",
          Array.from(computationStore.variables.entries()).map(([id, v]) => ({
            id,
            type: v.type,
            value: v.value,
            error: v.error,
          }))
        );

        // Log specifically dependent variables
        console.log(
          "🔍 Dependent variables after update:",
          Array.from(computationStore.variables.entries())
            .filter(([_, v]) => v.type === "dependent")
            .map(([id, v]) => ({ id, value: v.value }))
        );

        // Log evaluation function status
        console.log(
          "🔍 Evaluation function exists:",
          computationStore.getDebugState().hasFunction,
          "Last generated code:",
          computationStore.getDebugState().lastGeneratedCode
        );
      };

      const handleMouseUp = () => {
        isDragging = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      element.addEventListener("mousedown", (e: Event) => {
        if (!(e instanceof MouseEvent)) return;
        isDragging = true;
        startY = e.clientY;
        startValue = parseFloat(element.textContent || "0");

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        e.preventDefault();
      });
    });
  };

  useEffect(() => {
    if (isInitialized) {
      renderFormula();
    }
  }, [isInitialized, renderFormula]);

  return (
    <div
      ref={containerRef}
      className="bg-white p-6 h-full flex items-center justify-center"
    />
  );
});

export default BlockInteractivity;
