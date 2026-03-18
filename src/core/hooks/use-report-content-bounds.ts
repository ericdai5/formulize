import { useEffect } from "react";

import type { Node } from "@xyflow/react";

import type { ContentBounds } from "./use-auto-content-size";

interface UseReportContentBoundsParams {
  nodes: Node[];
  nodesInitialized: boolean;
  canvasVisible: boolean;
  getNodes: () => Node[];
  getNodesBounds: (nodes: Node[]) => { width: number; height: number };
  onContentBoundsChange?: (bounds: ContentBounds) => void;
}

export const useReportContentBounds = ({
  nodes,
  nodesInitialized,
  canvasVisible,
  getNodes,
  getNodesBounds,
  onContentBoundsChange,
}: UseReportContentBoundsParams): void => {
  useEffect(() => {
    if (!onContentBoundsChange || !nodesInitialized) {
      return;
    }

    const currentNodes = getNodes();
    if (
      currentNodes.length === 0 ||
      !currentNodes.every(
        (node) => !!node.measured?.width && !!node.measured?.height
      )
    ) {
      return;
    }

    const bounds = getNodesBounds(currentNodes);
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    onContentBoundsChange({
      width: bounds.width,
      height: bounds.height,
    });
  }, [
    nodes,
    nodesInitialized,
    canvasVisible,
    getNodes,
    getNodesBounds,
    onContentBoundsChange,
  ]);
};
