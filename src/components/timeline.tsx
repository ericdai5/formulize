import React, { useEffect, useRef } from "react";

import { CornerDownLeft, MessageCircleMore } from "lucide-react";

import { IStep } from "../types/step";

interface TimelineProps {
  history: IStep[];
  historyIndex: number;
  code: string;
  getLineFromCharPosition: (code: string, charPosition: number) => number;
  isAtBlock: (index: number) => boolean;
  isAtView: (index: number) => boolean;
  onTimelineItemClick: (index: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  history,
  historyIndex,
  code,
  getLineFromCharPosition,
  isAtBlock,
  isAtView,
  onTimelineItemClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new items are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Find the parent scroll container (CollapsibleSection content)
      const parentScrollContainer = scrollContainerRef.current.closest(
        '[class*="overflow-y-auto"]'
      );
      if (parentScrollContainer) {
        parentScrollContainer.scrollTop = parentScrollContainer.scrollHeight;
      }
    }
  }, [history.length]);

  // Auto-scroll to keep active item visible when historyIndex changes
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [historyIndex]);

  return (
    <div className="w-full overflow-x-auto overflow-y-auto" ref={scrollContainerRef}>
      <div className="inline-block min-w-full">
        {history.map((state, index) => {
          return (
            <div
              key={index}
              ref={index === historyIndex ? activeItemRef : null}
              className={`py-1 px-4 cursor-pointer font-mono text-sm tracking-tighter hover:bg-slate-100 w-full ${
                index === historyIndex ? "bg-blue-50" : ""
              }`}
              onClick={() => onTimelineItemClick(index)}
            >
              <div
                className={`flex items-center gap-2 whitespace-nowrap ${
                  index === historyIndex ? "text-blue-800" : "text-slate-600"
                }`}
              >
              <span className="font-semibold">{index}</span>
              <span>
                P: {state.highlight.start}-{state.highlight.end}
              </span>
              <span>
                L: {getLineFromCharPosition(code, state.highlight.start) + 1}
              </span>
              <span>
                {state.stackTrace.length > 0
                  ? state.stackTrace[state.stackTrace.length - 1]
                  : "-"}
              </span>
              {isAtView(index) && (
                <div className="bg-purple-100 p-1 rounded">
                  <MessageCircleMore size={12} className="text-purple-900" />
                </div>
              )}
              {isAtBlock(index) && (
                <div className="bg-blue-100 p-1 rounded">
                  <CornerDownLeft size={12} className="text-blue-900" />
                </div>
              )}
            </div>
          </div>
        );
      })}
      {history.length === 0 && (
        <div className="text-center text-gray-500 p-8">
          Initialize debugging to see execution steps
        </div>
      )}
      </div>
    </div>
  );
};

export default Timeline;
