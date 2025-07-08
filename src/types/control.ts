export interface IControl {
  id?: string;
  type: "slider" | "dropdown" | "checkbox" | "button" | "radio" | "array";
  variable?: string;
}

export interface ISliderControl extends IControl {
  type: "slider";
  orientation?: "horizontal" | "vertical";
  showValue?: boolean;
}

export interface IArrayControl extends IControl {
  type: "array";
  orientation?: "horizontal" | "vertical";
}

export interface IDropdownControl extends IControl {
  type: "dropdown";
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface ICheckboxControl extends IControl {
  type: "checkbox";
  checked?: boolean;
}

export interface IButtonControl extends IControl {
  type: "button";
  onClick?: () => void;
}

export interface IRadioControl extends IControl {
  type: "radio";
  options: Array<{ value: string; label: string }>;
  selectedValue?: string;
}

export type IControls =
  | ISliderControl
  | IArrayControl
  | IDropdownControl
  | ICheckboxControl
  | IButtonControl
  | IRadioControl;
