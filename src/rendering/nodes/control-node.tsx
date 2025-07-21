import { observer } from "mobx-react-lite";

import ControlPanel from "../../components/controls/controls";

// Custom Control Panel Node Component
const ControlNode = observer(({ data }: { data: any }) => {
  const { controls } = data;

  if (!controls || controls.length === 0) {
    return (
      <div className="control-panel-node border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-slate-500 text-sm">No controls available</div>
      </div>
    );
  }

  return (
    <div className="control-panel-node border bg-white border-slate-200 rounded-3xl p-4">
      <div className="nodrag">
        <ControlPanel controls={controls} />
      </div>
    </div>
  );
});

export default ControlNode;
