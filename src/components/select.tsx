import React, { useEffect, useRef, useState } from "react";

import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  className = "",
  placeholder = "Select an option",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Find the selected option
  const selectedOption = options.find((option) => option.value === value);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
          break;
        case "Enter":
          event.preventDefault();
          if (focusedIndex >= 0) {
            handleOptionClick(options[focusedIndex].value);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, focusedIndex, options]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // When opening, focus on the currently selected option
      const selectedIndex = options.findIndex(
        (option) => option.value === value
      );
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  };

  const handleOptionClick = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  return (
    <div className="relative" ref={selectRef}>
      {/* Select Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`
          border rounded-xl px-3 py-2 pr-8 border-slate-200 appearance-none bg-white 
          text-base/none focus:outline-none focus:ring-2 focus:ring-blue-100 
          focus:border-blue-300 w-full text-left
          ${className}
        `}
      >
        {selectedOption ? selectedOption.label : placeholder}
      </button>

      {/* Chevron Icon */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div
          ref={optionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              className={`
                w-full text-left px-3 py-2 text-sm transition-colors duration-150
                first:rounded-t-xl last:rounded-b-xl
                ${
                  option.value === value
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50"
                }
                ${index === focusedIndex ? "bg-blue-100" : ""}
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;
