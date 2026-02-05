import React from "react";

import { GripHorizontal } from "lucide-react";

import { StepControl } from "../../core/step-control";

interface NodeWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component for rendering components inside the React Flow canvas.
 * Adds a draggable handle at the top and nodrag class to prevent dragging on interactive elements.
 */
export const NodeWrapper = ({ children }: NodeWrapperProps) => {
  return (
    <div>
      <div className="flex justify-center cursor-move py-1 text-slate-400 hover:text-slate-600">
        <GripHorizontal size={16} />
      </div>
      <div className="nodrag">{children}</div>
    </div>
  );
};

// Wrapped StepControl for use as a React Flow node
export const StepControlNode = () => (
  <NodeWrapper>
    <StepControl />
  </NodeWrapper>
);
