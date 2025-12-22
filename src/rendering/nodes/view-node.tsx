import { observer } from "mobx-react-lite";

import LatexLabel from "../../components/latex";

export interface ViewNodeData {
  expression: string;
  description: string;
}

const ViewNode = observer(({ data }: { data: ViewNodeData }) => {
  const { expression, description } = data;

  // Wrap text in \text{} for proper LaTeX text rendering
  const latexDescription = `\\text{${description}}`;

  return (
    <div
      className="view-flow-node text-base text-black font-regular text-center rounded-xl"
      style={{
        pointerEvents: "auto",
        width: "auto",
        height: "auto",
        position: "relative",
        cursor: "grab",
      }}
      title={`View comment for expression: ${expression} (draggable)`}
    >
      <LatexLabel latex={latexDescription} />
    </div>
  );
});

export default ViewNode;
