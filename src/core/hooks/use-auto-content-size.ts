import { useCallback, useState } from "react";
import type { CSSProperties } from "react";

export interface ContentBounds {
  width: number;
  height: number;
}

interface AutoContentSizeResult {
  autoWidth: boolean;
  autoHeight: boolean;
  width: CSSProperties["width"];
  height: CSSProperties["height"];
  onContentBoundsChange: (nextBounds: ContentBounds) => void;
}

/**
 * Derives container sizing from measured canvas bounds when width/height are
 * configured as auto (or omitted).
 */
export const useAutoContentSize = (
  style: CSSProperties
): AutoContentSizeResult => {
  const [contentBounds, setContentBounds] = useState<ContentBounds | null>(
    null
  );

  const autoWidth = style.width === undefined || style.width === "auto";
  const autoHeight = style.height === undefined || style.height === "auto";

  const width = autoWidth
    ? contentBounds
      ? `${Math.ceil(contentBounds.width)}px`
      : style.width
    : style.width;
  const height = autoHeight
    ? contentBounds
      ? `${Math.ceil(contentBounds.height)}px`
      : style.height
    : style.height;

  const onContentBoundsChange = useCallback((nextBounds: ContentBounds) => {
    setContentBounds((currentBounds) => {
      if (
        currentBounds &&
        currentBounds.width === nextBounds.width &&
        currentBounds.height === nextBounds.height
      ) {
        return currentBounds;
      }
      return nextBounds;
    });
  }, []);

  return {
    autoWidth,
    autoHeight,
    width,
    height,
    onContentBoundsChange,
  };
};
