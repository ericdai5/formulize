import React, { useEffect, useState } from "react";

import { computationStore } from "../../store/computation";
import { IRole } from "../../types/variable";
import { getVariable } from "../../util/computation-helpers";

const VariableTooltip = ({
  position,
  onSelect,
  currentRole,
  id, // id of the currently selected variable
}: {
  position: { x: number; y: number };
  onSelect: (role: IRole) => void;
  currentRole: IRole | "none";
  id: string;
}) => {
  const [value, setValue] = useState("0");
  const variable = getVariable(id);

  // Initialize value from variable state
  useEffect(() => {
    if (variable && variable.value !== undefined) {
      setValue(variable.value.toString());
    }
  }, [variable?.value]);

  const handleRoleSelect = (role: IRole) => {
    if (role === "constant") {
      setShowValueInput(true);
    } else {
      // For non-constant types, just update the type
      computationStore.setVariableRole(id, role);
      onSelect(role);
    }
  };

  const handleValueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      computationStore.setValue(id, numValue);
      onSelect("constant");
    }
  };

  const [showValueInput, setShowValueInput] = useState(
    currentRole === "constant"
  );

  useEffect(() => {
    setShowValueInput(currentRole === "constant");
  }, [currentRole]);

  const options = [
    { role: "constant" as const, icon: "📌", label: "Fixed" },
    { role: "input" as const, icon: "↔️", label: "Slidable" },
    { role: "computed" as const, icon: "🔄", label: "Dependent" },
  ];

  return (
    <div
      className="
        absolute z-[9999] pointer-events-auto
        flex flex-col gap-1 p-1
        bg-white border border-slate-200 rounded-xl
        shadow-md
        transform -translate-x-1/2 -translate-y-[150%]
      "
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {showValueInput && (
        <form
          onSubmit={handleValueSubmit}
          className="flex gap-2 items-center justify-center p-2 bg-slate-100 rounded-md"
        >
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-20 p-1 border border-slate-200 rounded-md"
            step="0.1"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1 bg-slate-700 text-white cursor-pointer flex items-center justify-center rounded-md"
          >
            Set
          </button>
        </form>
      )}

      <div className="flex items-center">
        {options.map(({ role, icon, label }, index) => (
          <div key={role} className="flex items-center">
            <button
              onClick={() => handleRoleSelect(role)}
              className={`
                flex flex-row gap-2 items-center
                px-2 py-1 min-w-16 cursor-pointer
                border rounded-lg transition-all duration-200
                ${
                  currentRole === role
                    ? "border-blue-300 bg-blue-50"
                    : "border-1 border-white bg-white hover:bg-slate-100"
                }
              `}
            >
              <span className="text-sm">{icon}</span>
              <span className="text-sm font-light">{label}</span>
            </button>
            {index < options.length - 1 && (
              <div className="mx-1 h-4 border-r border-slate-200" />
            )}
          </div>
        ))}
      </div>

      {/* <div className="absolute left-1/2 bottom-[-5px] w-[10px] h-[10px] bg-white border border-gray-300 border-t-0 border-l-0 transform -translate-x-1/2 rotate-45"></div> */}
    </div>
  );
};

export default VariableTooltip;
