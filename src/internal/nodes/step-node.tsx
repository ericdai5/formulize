import { observer } from "mobx-react-lite";

import { debugStore } from "../../store/debug";
import { buildDebugStyles } from "../../util/debug-styles";
import LatexLabel from "../latex";

export interface StepNodeData {
  description: string;
}

const StepNode = observer(({ data }: { data: StepNodeData }) => {
  const { description } = data;
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
      title="Step description"
    >
      <LatexLabel latex={latexDescription} />
    </div>
  );
});

export default StepNode;
