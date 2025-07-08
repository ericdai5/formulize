import { observer } from "mobx-react-lite";

import { IControls, ISliderControl, IArrayControl } from "../../types/control";
import Slider from "./slider";
import Array from "./array";

interface ControlPanelProps {
  controls: IControls[];
}

const ControlPanel = observer(({ controls }: ControlPanelProps) => {
  if (!controls || controls.length === 0) {
    return null;
  }

  const renderControl = (control: IControls, index: number) => {
    const key = control.id || `control-${index}`;
    
    switch (control.type) {
      case "slider":
        return <Slider key={key} control={control as ISliderControl} />;

      case "array":
        return <Array key={key} control={control as IArrayControl} />;

      case "dropdown":
        // TODO: Implement
        return null;

      case "checkbox":
        // TODO: Implement
        return null;

      case "button":
        // TODO: Implement
        return null;

      case "radio":
        // TODO: Implement
        return null;
    }
  };

  return (
    <div className="controls-container flex flex-wrap gap-4">
      {controls.map(renderControl)}
    </div>
  );
});

export default ControlPanel;
