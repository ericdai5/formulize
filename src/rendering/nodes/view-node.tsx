import { observer } from "mobx-react-lite";

export interface ViewNodeData {
  expression: string;
  description: string;
}

const ViewNode = observer(({ data }: { data: ViewNodeData }) => {
  const { expression, description } = data;

  return (
    <div
      className="view-flow-node text-base text-black font-regular text-center bg-white border border-slate-200 rounded-xl px-4 py-2 hover:scale-105 transition-all duration-100"
      style={{
        pointerEvents: "auto",
        width: "auto",
        height: "auto",
        position: "relative",
        cursor: "grab",
      }}
      title={`View comment for expression: ${expression} (draggable)`}
    >
      {description}
    </div>
  );
});

export default ViewNode;
