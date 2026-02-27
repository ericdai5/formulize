const MATH_MODE_DELIMITER = "$$";

export interface LatexInlineSegment {
  type: "text" | "math";
  content: string;
}

export function toLatexText(content: string): string {
  // Keep plain-text segments readable when injected into MathJax inline mode.
  return `\\text{${content}}`;
}

export function unwrapMathMode(content: string): string | null {
  const trimmed = content.trim();
  const delimiterLength = MATH_MODE_DELIMITER.length;
  if (
    trimmed.length >= delimiterLength * 2 &&
    trimmed.startsWith(MATH_MODE_DELIMITER) &&
    trimmed.endsWith(MATH_MODE_DELIMITER)
  ) {
    const inner = trimmed.slice(delimiterLength, -delimiterLength).trim();
    if (inner.length === 0) {
      return null;
    }
    if (inner.includes(MATH_MODE_DELIMITER)) {
      return null;
    }
    if (trimmed !== `${MATH_MODE_DELIMITER}${inner}${MATH_MODE_DELIMITER}`) {
      return null;
    }
    return inner;
  }
  return null;
}

function appendTextSegment(
  segments: LatexInlineSegment[],
  content: string
): void {
  if (content.length > 0) {
    segments.push({ type: "text", content });
  }
}

function appendMathSegment(
  segments: LatexInlineSegment[],
  content: string
): void {
  const trimmed = content.trim();
  if (trimmed.length > 0) {
    segments.push({ type: "math", content: trimmed });
  }
}

export function splitInlineLatexSegments(
  content: string
): LatexInlineSegment[] | null {
  // Fast path for common plain-text labels.
  if (!content.includes(MATH_MODE_DELIMITER)) {
    return null;
  }
  const segments: LatexInlineSegment[] = [];
  let cursor = 0;
  while (cursor < content.length) {
    const mathStart = content.indexOf(MATH_MODE_DELIMITER, cursor);
    if (mathStart === -1) {
      appendTextSegment(segments, content.slice(cursor));
      break;
    }
    appendTextSegment(segments, content.slice(cursor, mathStart));
    const mathEnd = content.indexOf(MATH_MODE_DELIMITER, mathStart + 2);
    if (mathEnd === -1) {
      // Unbalanced delimiters should fall back to plain text rendering.
      return null;
    }
    appendMathSegment(segments, content.slice(mathStart + 2, mathEnd));
    cursor = mathEnd + 2;
  }
  return segments.length > 0 ? segments : null;
}

export function renderInlineLatexSegments(
  segments: LatexInlineSegment[]
): string {
  // Math chunks are passed through, text chunks are wrapped for safe display.
  return segments
    .map((segment) =>
      segment.type === "math" ? segment.content : toLatexText(segment.content)
    )
    .join("");
}

export function formatInlineLatex(content: string): string | null {
  // Entire-string math mode: "$$...$$"
  const pureMath = unwrapMathMode(content);
  if (pureMath !== null) {
    return pureMath;
  }
  // Mixed inline content: "text $$math$$ text"
  const segments = splitInlineLatexSegments(content);
  if (!segments) {
    return null;
  }
  return renderInlineLatexSegments(segments);
}
