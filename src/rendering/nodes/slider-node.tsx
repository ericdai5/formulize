import { observer } from "mobx-react-lite";

import Slider from "../../components/controls/slider";
import { ISliderControl } from "../../types/control";

// Custom Slider Node Component
const SliderNode = observer(({ data }: { data: { control: ISliderControl } }) => {
  const { control } = data;

  if (!control) {
    return (
      <div className="slider-node border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-slate-500 text-sm">No slider control available</div>
      </div>
    );
  }

  return (
    <div className="slider-node border bg-white border-slate-200 rounded-3xl p-4">
      <div className="nodrag">
        <Slider control={control} />
      </div>
    </div>
  );
});

export default SliderNode;