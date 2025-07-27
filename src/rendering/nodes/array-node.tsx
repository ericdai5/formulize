import { observer } from "mobx-react-lite";

import ArrayControl from "../../components/controls/array";
import { IArrayControl } from "../../types/control";

// Custom Array Node Component
const ArrayNode = observer(({ data }: { data: { control: IArrayControl } }) => {
  const { control } = data;

  if (!control) {
    return (
      <div className="array-node border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-slate-500 text-sm">No array control available</div>
      </div>
    );
  }

  return (
    <div className="array-node border bg-white border-slate-200 rounded-3xl p-4">
      <div className="nodrag">
        <ArrayControl control={control} />
      </div>
    </div>
  );
});

export default ArrayNode;