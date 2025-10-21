import { observer } from "mobx-react-lite";

import SetControl from "../../components/controls/set";
import { ISetControl } from "../../types/control";

// Custom Set Node Component
const SetNode = observer(({ data }: { data: { control: ISetControl } }) => {
  const { control } = data;

  if (!control) {
    return (
      <div className="set-node border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-slate-500 text-sm">No set control available</div>
      </div>
    );
  }

  return (
    <div className="set-node border bg-white border-slate-200 rounded-3xl p-4">
      <div className="nodrag">
        <SetControl control={control} />
      </div>
    </div>
  );
});

export default SetNode;
