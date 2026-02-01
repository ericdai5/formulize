import { observer } from "mobx-react-lite";

import { Handle, Position } from "@xyflow/react";

import { debugStore } from "../../store/debug";
import { buildDebugStyles } from "../../util/debug-styles";
import { HANDLE_STYLE } from "../css-classes";
import LatexLabel from "../latex";

export interface StepNodeData {
  expression: string;
  description: string;
  activeVarIds?: string[];
}

const StepNode = observer(({ data }: { data: StepNodeData }) => {
  const { expression, description } = data;
  // Wrap text in \text{} for proper LaTeX text rendering
  const latexDescription = `\\text{${description}}`;

  // Build debug styles from store settings
  const debugStyles = buildDebugStyles(
    debugStore.showStepBorders,
    debugStore.showStepShadow
  );

  return (
    <div
      className="view-flow-node text-base text-black font-regular text-center"
      style={{
        pointerEvents: "auto",
        width: "auto",
        height: "auto",
        position: "relative",
        cursor: "grab",
        ...debugStyles,
      }}
      title={`View comment for expression: ${expression} (draggable)`}
    >
      {/* Handle at the center bottom for connecting edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="step-handle-bottom"
        style={HANDLE_STYLE}
      />
      <LatexLabel latex={latexDescription} />
    </div>
  );
});

export default StepNode;
