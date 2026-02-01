import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = "left",
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = rect.top - gap;
        left = rect.left + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - gap;
        break;
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.right + gap;
        break;
    }

    setTooltipPosition({ top, left });
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setShouldRender(true);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
    setTimeout(() => {
      setShouldRender(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTransformOrigin = {
    top: "bottom center",
    bottom: "top center",
    left: "right center",
    right: "left center",
  };

  const getTransform = {
    top: `translate(-50%, -100%) translateY(${isVisible ? "0" : "4px"}) scale(${isVisible ? 1 : 0})`,
    bottom: `translate(-50%, 0%) translateY(${isVisible ? "0" : "-4px"}) scale(${isVisible ? 1 : 0})`,
    left: `translate(-100%, -50%) translateX(${isVisible ? "0" : "4px"}) scale(${isVisible ? 1 : 0})`,
    right: `translate(0%, -50%) translateX(${isVisible ? "0" : "-4px"}) scale(${isVisible ? 1 : 0})`,
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {shouldRender &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              opacity: isVisible ? 1 : 0,
              transform: getTransform[position],
              transformOrigin: getTransformOrigin[position],
              transition:
                "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 100ms ease-out",
            }}
          >
            <div className="bg-slate-900 text-white text-xs font-normal px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
              {content}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Tooltip;
