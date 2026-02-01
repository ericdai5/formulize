import React from "react";

interface SwitchProps {
  isActive: boolean;
  onToggle: () => void;
  label?: string;
  icon?: React.ReactNode;
}

const Switch: React.FC<SwitchProps> = ({ isActive, onToggle, label, icon }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {icon}
        {label && (
          <span className="text-sm font-normal text-slate-900">{label}</span>
        )}
      </div>
      <button
        onClick={onToggle}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
          isActive ? "bg-slate-900" : "bg-slate-300"
        }`}
        aria-checked={isActive}
        role="switch"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            isActive ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};

export default Switch;
