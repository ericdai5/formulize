import { useEffect } from "react";

export const useFitViewAfterReveal = (
  canvasVisible: boolean,
  fitView: () => void
): void => {
  useEffect(() => {
    if (!canvasVisible) {
      return;
    }

    // Re-apply fit after the visible render commits so the viewport reflects
    // the final measured layout, not just the hidden pre-reveal state.
    const frameId = window.requestAnimationFrame(() => {
      fitView();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [canvasVisible, fitView]);
};
