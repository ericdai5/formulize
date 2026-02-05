import { observer } from "mobx-react-lite";

import {
  ICheckboxControl,
  IControls,
  ISetControl,
  ISliderControl,
} from "../../types/control";
import CheckboxControl from "./checkbox";
import SetControl from "./set";
import Slider from "./slider";

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

      case "set":
        return <SetControl key={key} control={control as ISetControl} />;

      case "dropdown":
        // TODO: Implement
        return null;

      case "checkbox":
        return (
          <CheckboxControl key={key} control={control as ICheckboxControl} />
        );

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
