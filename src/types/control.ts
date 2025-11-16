export interface IControl {
  id?: string;
  type: "slider" | "dropdown" | "checkbox" | "button" | "radio" | "array" | "set";
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
  index?: string; // Variable name for the index (e.g., "i" in for loops)
}

export interface IDropdownControl extends IControl {
  type: "dropdown";
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface ICheckboxControl extends IControl {
  type: "checkbox";
  availableElements: string[];
  orientation?: "horizontal" | "vertical";
}

export interface IButtonControl extends IControl {
  type: "button";
  code?: (variables: Record<string, any>) => void; // Function to execute when button is clicked
  label?: string; // Button label text
}

export interface IRadioControl extends IControl {
  type: "radio";
  orientation?: "horizontal" | "vertical";
}

export interface ISetControl extends IControl {
  type: "set";
  availableElements: string[];
  color?: string;
  maxHeight?: number;
}

export type IControls =
  | ISliderControl
  | IArrayControl
  | IDropdownControl
  | ICheckboxControl
  | IButtonControl
  | IRadioControl
  | ISetControl;
