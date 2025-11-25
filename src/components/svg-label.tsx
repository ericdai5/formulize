import { useEffect, useRef, useState } from "react";

import { observer } from "mobx-react-lite";

import DOMPurify from "dompurify";

import type {
  SVGGeneratorContext,
  VariableSVGContent,
} from "../rendering/svg/svg-registry";
import { computationStore } from "../store/computation";
import type { IVariable } from "../types/variable";

interface SVGLabelProps {
  svgPath?: string;
  svgContent?: VariableSVGContent;
  svgSize?: { width: number; height: number };
  variable?: IVariable;
}

const SVGLabel = observer(
  ({ svgPath, svgContent, svgSize, variable }: SVGLabelProps) => {
    const svgRef = useRef<HTMLDivElement>(null);
    const [svgData, setSvgData] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fontSize = computationStore.environment?.fontSize || 1;

    useEffect(() => {
      const loadSVG = async () => {
        try {
          setError(null);
          setIsLoading(true);
          setSvgData(null);

          if (svgContent) {
            if (typeof svgContent === "function") {
              try {
                const size = svgSize || { width: 24, height: 24 };
                const context: SVGGeneratorContext = {
                  width: size.width,
                  height: size.height,
                  value: variable?.value,
                  variable: variable,
                  environment: computationStore.environment || undefined,
                };
                const result = svgContent(context);
                // Handle both string and SVGElement returns
                if (typeof result === "string") {
                  setSvgData(result);
                } else if (result instanceof SVGElement) {
                  const serializer = new XMLSerializer();
                  setSvgData(serializer.serializeToString(result));
                } else {
                  throw new Error(
                    "SVG generator function must return a string or SVGElement"
                  );
                }
              } catch (error) {
                throw new Error(
                  `Error executing SVG generator function: ${error instanceof Error ? error.message : String(error)}`
                );
              }
            } else {
              setSvgData(svgContent);
            }
          } else if (svgPath) {
            const response = await fetch(svgPath);
            if (!response.ok) {
              throw new Error(`Failed to load SVG: ${response.statusText}`);
            }
            const svgText = await response.text();
            if (!svgText || svgText.trim() === "") {
              throw new Error("SVG file is empty");
            }
            // Check if the response is actually an SVG (not a fallback HTML page)
            if (!svgText.includes("<svg") && !svgText.includes("<?xml")) {
              throw new Error("Invalid SVG content");
            }
            setSvgData(svgText);
          } else {
            throw new Error("No SVG content or path provided");
          }
        } catch (err) {
          console.error("Error loading SVG:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
          setSvgData(null);
        } finally {
          setIsLoading(false);
        }
      };

      loadSVG();
    }, [svgPath, svgContent, variable?.value, svgSize]);

    if (isLoading) {
      return (
        <div className="text-gray-400 text-xs" title="Loading SVG...">
          Loading...
        </div>
      );
    }

    if (error) {
      return (
        <div
          className="text-red-500 text-xs font-mono bg-red-50 px-2 py-1 rounded"
          title={`SVG Error: ${error}`}
        >
          ERROR
        </div>
      );
    }

    if (!svgData) {
      return (
        <div
          className="text-gray-500 text-xs font-mono bg-gray-50 px-2 py-1 rounded"
          title="No SVG data available"
        >
          ERROR
        </div>
      );
    }

    const size = svgSize || { width: 24, height: 24 };
    const scaledSize = {
      width: size.width * fontSize,
      height: size.height * fontSize,
    };

    // Sanitize SVG using DOMPurify with strict SVG-only profile
    // Allow animation tags and attributes for dynamic SVG content
    const sanitizedSvg = DOMPurify.sanitize(svgData, {
      USE_PROFILES: { svg: true },
      ADD_TAGS: ["animate", "animateTransform", "animateMotion"],
      ADD_ATTR: [
        "attributeName",
        "values",
        "dur",
        "repeatCount",
        "fill",
        "from",
        "to",
        "by",
        "begin",
        "end",
        "calcMode",
        "keyTimes",
        "keySplines",
        "type",
      ],
    });

    const finalSvg = sanitizedSvg.replace(
      /<svg([^>]*)>/,
      `<svg$1 width="${scaledSize.width}" height="${scaledSize.height}">`
    );

    return (
      <div
        ref={svgRef}
        className="svg-label-container"
        style={{
          width: scaledSize.width,
          height: scaledSize.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        dangerouslySetInnerHTML={{
          __html: finalSvg,
        }}
      />
    );
  }
);

export default SVGLabel;
