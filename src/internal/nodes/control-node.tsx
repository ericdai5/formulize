import { observer } from "mobx-react-lite";

import ButtonControl from "../../core/controls/button";
import CheckboxControl from "../../core/controls/checkbox";
import RadioControl from "../../core/controls/radio";
import SetControl from "../../core/controls/set";
import Slider from "../../core/controls/slider";

// Generic Control Node Component that handles all control types
const ControlNode = observer(({ data }: { data: any }) => {
  const { control } = data;

  if (control) {
    return (
      <div className="control-node border bg-white border-slate-200 rounded-3xl p-4">
        <div className="nodrag">
          {control.type === "slider" && <Slider control={control} />}
          {control.type === "set" && <SetControl control={control} />}
          {control.type === "checkbox" && <CheckboxControl control={control} />}
          {control.type === "radio" && <RadioControl control={control} />}
          {control.type === "button" && <ButtonControl control={control} />}
        </div>
      </div>
    );
  }

  return null;
});

export default ControlNode;
