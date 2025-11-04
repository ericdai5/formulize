import { observer } from "mobx-react-lite";

import ArrayControl from "../../components/controls/array";
import CheckboxControl from "../../components/controls/checkbox";
import SetControl from "../../components/controls/set";
import Slider from "../../components/controls/slider";
import { IControls } from "../../types/control";

// Generic Control Node Component that handles all control types
const ControlNode = observer(({ data }: { data: any }) => {
  const { control, controls } = data;

  // Handle single control (new architecture)
  if (control) {
    return (
      <div className="control-node border bg-white border-slate-200 rounded-3xl p-4">
        <div className="nodrag">
          {control.type === "slider" && <Slider control={control} />}
          {control.type === "array" && <ArrayControl control={control} />}
          {control.type === "set" && <SetControl control={control} />}
          {control.type === "checkbox" && <CheckboxControl control={control} />}
          {!["slider", "array", "set", "checkbox"].includes(control.type) && (
            <div className="text-slate-500 text-sm">
              Control type "{control.type}" not implemented
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle legacy control panel (array of controls)
  if (!controls || controls.length === 0) {
    return (
      <div className="control-node border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-slate-500 text-sm">No controls available</div>
      </div>
    );
  }

  return (
    <div className="control-node border bg-white border-slate-200 rounded-3xl p-4">
      <div className="nodrag flex flex-col gap-4">
        {controls.map((ctrl: IControls, index: number) => (
          <div key={index}>
            {ctrl.type === "slider" && <Slider control={ctrl} />}
            {ctrl.type === "array" && <ArrayControl control={ctrl} />}
            {ctrl.type === "set" && <SetControl control={ctrl} />}
            {ctrl.type === "checkbox" && <CheckboxControl control={ctrl} />}
          </div>
        ))}
      </div>
    </div>
  );
});

export default ControlNode;
