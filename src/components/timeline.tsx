import React, { useEffect, useRef } from "react";

import { IStep } from "../types/step";

interface TimelineProps {
  history: IStep[];
  historyIndex: number;
  code: string;
  getLineFromCharPosition: (code: string, charPosition: number) => number;
  isAtBlock: (index: number) => boolean;
  onTimelineItemClick: (index: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  history,
  historyIndex,
  code,
  getLineFromCharPosition,
  isAtBlock,
  onTimelineItemClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new items are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [history.length]);

  return (
    <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
      {history.map((state, index) => {
        return (
          <div
            key={index}
            className={`py-3 px-4 border-b border-slate-200 cursor-pointer hover:bg-slate-50 ${
              index === historyIndex ? "bg-blue-50" : ""
            }`}
            onClick={() => onTimelineItemClick(index)}
          >
            <div
              className={`text-sm flex items-center gap-2 ${
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
              {isAtBlock(index) && (
                <div className="w-3 h-3 bg-green-500 rounded-sm" />
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
  );
};

export default Timeline;
