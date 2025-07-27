import { useEffect, useRef } from "react";

interface LatexLabelProps {
  latex: string;
}

const LatexLabel = ({ latex }: LatexLabelProps) => {
  const labelRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let isMounted = true; // Track if component is still mounted
    const renderLatex = async () => {
      if (!labelRef.current || !window.MathJax || !isMounted) return;
      try {
        await window.MathJax.startup.promise;
        // Check again after async operation
        if (!labelRef.current || !isMounted) return;
        labelRef.current.innerHTML = `\\(${latex}\\)`;
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
  }, [latex]);

  return (
    <span
      ref={labelRef}
      className="flex items-center justify-center"
      style={{ fontSize: "0.6rem" }}
    >
      {latex}
    </span>
  );
};

export default LatexLabel;
