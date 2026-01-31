import React, { useEffect, useRef, useState } from "react";

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShouldRender(true);
      // Small delay to allow DOM to update before showing
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
    // Wait for animation before removing from DOM
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

  // Position classes without translate (we handle transforms in inline styles)
  const positionClasses = {
    top: "bottom-full left-1/2 mb-2",
    bottom: "top-full left-1/2 mt-2",
    left: "right-full top-1/2 mr-2",
    right: "left-full top-1/2 ml-2",
  };

  // Combined transforms: centering + slide animation
  const getTransform = {
    top: `translateX(-50%) translateY(${isVisible ? "0" : "4px"}) scale(${isVisible ? 1 : 0})`,
    bottom: `translateX(-50%) translateY(${isVisible ? "0" : "-4px"}) scale(${isVisible ? 1 : 0})`,
    left: `translateY(-50%) translateX(${isVisible ? "0" : "4px"}) scale(${isVisible ? 1 : 0})`,
    right: `translateY(-50%) translateX(${isVisible ? "0" : "-4px"}) scale(${isVisible ? 1 : 0})`,
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {shouldRender && (
        <div
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: getTransform[position],
            transition:
              "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 100ms ease-out",
          }}
        >
          <div className="bg-slate-900 text-white text-xs font-normal px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
