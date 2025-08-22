import { useEffect, useRef } from "react";

import { observer } from "mobx-react-lite";

import { computationStore } from "../store/computation";

interface LatexLabelProps {
  latex: string;
}

const LatexLabel = observer(({ latex }: LatexLabelProps) => {
  const labelRef = useRef<HTMLSpanElement>(null);

  const fontSize = computationStore.environment?.fontSize;

  useEffect(() => {
    let isMounted = true; // Track if component is still mounted
    const renderLatex = async () => {
      if (!labelRef.current || !window.MathJax || !isMounted) return;
      try {
        await window.MathJax.startup.promise;
        // Check again after async operation
        if (!labelRef.current || !isMounted) return;
        // Apply fontSize directly to the HTML like formula-node.tsx does
        labelRef.current.innerHTML = `<div style="font-size: ${fontSize}em">\\(${latex}\\)</div>`;
        await window.MathJax.typesetPromise([labelRef.current]);
      } catch (error) {
        console.error("Error rendering LaTeX label:", error);
        // Fallback to plain text with null check
        if (labelRef.current && isMounted) {
          labelRef.current.textContent = latex;
        }
      }
    };
    renderLatex();
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [latex, fontSize]); // Add fontSize to dependencies

  return (
    <span ref={labelRef} className="flex items-center justify-center">
      {latex}
    </span>
  );
});

export default LatexLabel;
